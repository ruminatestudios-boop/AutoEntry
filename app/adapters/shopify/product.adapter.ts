import type { PlatformAdapter } from "../../core/ports/platform.adapter";
import type { ScannedProduct } from "../../core/types/product";

export class ShopifyProductAdapter implements PlatformAdapter {
  constructor(private admin: any, private shop?: string) { }

  async createProduct(product: ScannedProduct): Promise<{ id: string; url?: string }> {
    let shopDomain = this.shop;

    if (!shopDomain) {
      const shopInfo = await this.getShopInfo();
      shopDomain = shopInfo.myshopifyDomain;
    }

    const hasVariants = product.variants && Array.isArray(product.variants.options) && product.variants.options.length > 0
      && product.variants.options.some((o: any) => (o.values?.length ?? 0) > 0);

    // Step 1: Prepare product input (clean taxonomy for Shopify AI / Magic)
    const productInput: any = {
      title: product.title,
      descriptionHtml: product.descriptionHtml,
      productType: product.productType,
      tags: product.tags,
      status: product.status,
      metafields: [
        { namespace: "auto_entry", key: "source", value: "snap_to_stock", type: "single_line_text_field" },
      ],
    };

    if (hasVariants) {
      productInput.productOptions = product.variants!.options.map((o, i) => ({
        name: o.name,
        position: i + 1,
        values: (o.values || []).map((v: string) => ({ name: v })),
      }));
    }

    // Prepare media inputs after ensuring all images are uploaded/available as URLs
    const mediaInput = [];
    for (const url of product.imageUrls || []) {
      if (url.startsWith("data:")) {
        try {
          const uploadedUrl = await this.uploadBase64Image(url);
          if (uploadedUrl) {
            mediaInput.push({
              originalSource: uploadedUrl,
              mediaContentType: "IMAGE"
            });
          }
        } catch (e) {
          console.error("Failed to upload base64 image:", e);
        }
      } else {
        mediaInput.push({
          originalSource: url,
          mediaContentType: "IMAGE"
        });
      }
    }

    const createMutation = `#graphql
      mutation productCreate($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
        productCreate(product: $product, media: $media) {
          product {
            id
            handle
            variants(first: 250) {
              edges {
                node {
                  id
                  inventoryItem {
                    id
                  }
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const createResponse = await this.admin.graphql(createMutation, {
      variables: {
        product: productInput,
        media: mediaInput
      },
    });

    const createJson = await createResponse.json();

    if (createJson.data?.productCreate?.userErrors?.length > 0) {
      throw new Error(createJson.data.productCreate.userErrors[0].message);
    }

    const createdProduct = createJson.data.productCreate.product;

    if (hasVariants) {
      // Step 2: Create variants in bulk. productCreate only creates one default variant (first option value),
      // so we bulk-create only the remaining combinations to get one variant per value.
      const combinations = this.generateCombinations(product.variants!.options);
      const combinationsToCreate = combinations.length > 1 ? combinations.slice(1) : [];

      const bulkCreateMutation = `#graphql
        mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkCreate(productId: $productId, variants: $variants) {
            productVariants {
              id
              inventoryItem {
                id
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const weightKg = product.estimatedWeight != null && product.estimatedWeight > 0
        ? product.estimatedWeight / 1000
        : undefined;
      const baseInventoryItem: any = {
        tracked: product.trackInventory || false
      };
      if (weightKg != null && weightKg > 0) {
        baseInventoryItem.measurement = {
          weight: { value: weightKg, unit: "KILOGRAMS" }
        };
      }
      const variantsInput = combinationsToCreate.map(combo => ({
        optionValues: combo.map((value, index) => ({
          optionName: product.variants!.options[index].name,
          name: value
        })),
        price: product.price || "0.00",
        inventoryItem: {
          ...baseInventoryItem,
          sku: product.sku ? `${product.sku}-${combo.join("-")}` : undefined
        }
      }));

      let createdVariants: any[] = createdProduct.variants?.edges?.map((e: any) => e?.node).filter(Boolean) ?? [];
      if (variantsInput.length > 0) {
        const bulkResponse = await this.admin.graphql(bulkCreateMutation, {
          variables: {
            productId: createdProduct.id,
            variants: variantsInput
          }
        });

        const bulkJson = await bulkResponse.json();
        const bulkData = bulkJson.data?.productVariantsBulkCreate;
        if (bulkData?.userErrors?.length > 0) {
          const msg = bulkData.userErrors.map((e: any) => e.message).join("; ");
          throw new Error(`Could not create all variants: ${msg}`);
        }
        const bulkCreated = bulkData?.productVariants ?? [];
        createdVariants = [...createdVariants, ...bulkCreated];
      }

      // Step 2b: Set price (and sku) on the default/first variant — Shopify creates it without our price
      const defaultVariant = createdVariants[0];
      if (defaultVariant && (product.price || product.sku)) {
        const updateMutation = `#graphql
          mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
            productVariantsBulkUpdate(productId: $productId, variants: $variants) {
              productVariants { id }
              userErrors { field message }
            }
          }
        `;
        const firstCombo = combinations[0];
        const defaultSku = product.sku && firstCombo ? `${product.sku}-${firstCombo.join("-")}` : undefined;
        const updateRes = await this.admin.graphql(updateMutation, {
          variables: {
            productId: createdProduct.id,
            variants: [{
              id: defaultVariant.id,
              price: product.price || "0.00",
              ...(defaultSku ? { inventoryItem: { sku: defaultSku } } : {}),
            }],
          },
        });
        const updateJson = await updateRes.json();
        const errs = updateJson.data?.productVariantsBulkUpdate?.userErrors;
        if (errs?.length > 0) {
          console.error("Failed to set default variant price:", errs);
        }
      }

      // Step 3: Set inventory per variant (use per-option quantities when single option, else fallback to product.inventoryQuantity)
      if (createdVariants.length > 0 && (product.trackInventory || product.variants!.options.some((o: any) => (o.quantities?.length ?? 0) > 0))) {
        const inventoryItemIds = createdVariants.map((v: any) => v.inventoryItem?.id).filter(Boolean);
        const opts = product.variants!.options;
        let quantities: number[] | null = null;
        if (opts.length === 1 && Array.isArray(opts[0].quantities) && opts[0].quantities!.length === opts[0].values.length) {
          quantities = opts[0].quantities!;
        }
        if (quantities && quantities.length === inventoryItemIds.length) {
          await this.setInventoryLevels(inventoryItemIds, quantities);
        } else if (product.trackInventory && product.inventoryQuantity != null) {
          await this.setInventoryLevels(inventoryItemIds, product.inventoryQuantity);
        }
      }

    } else {
      // Single product flow (existing)
      const defaultVariant = createdProduct.variants.edges[0]?.node;
      if (defaultVariant) {
        const updateVariantMutation = `#graphql
          mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
            productVariantsBulkUpdate(productId: $productId, variants: $variants) {
              productVariants {
                id
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const weightKg = product.estimatedWeight != null && product.estimatedWeight > 0
          ? product.estimatedWeight / 1000
          : undefined;
        const inventoryItemInput: any = {
          sku: product.sku || undefined,
          tracked: product.trackInventory || false
        };
        if (weightKg != null && weightKg > 0) {
          inventoryItemInput.measurement = {
            weight: { value: weightKg, unit: "KILOGRAMS" }
          };
        }
        await this.admin.graphql(updateVariantMutation, {
          variables: {
            productId: createdProduct.id,
            variants: [{
              id: defaultVariant.id,
              price: product.price || "0.00",
              inventoryItem: inventoryItemInput
            }]
          }
        });

        if (product.trackInventory && product.inventoryQuantity) {
          await this.setInventoryLevels([defaultVariant.inventoryItem.id], product.inventoryQuantity);
        }
      }
    }

    return {
      id: createdProduct.id,
      url: `https://admin.shopify.com/store/${shopDomain?.replace(".myshopify.com", "")}/products/${createdProduct.id.split("/").pop()}`
    };
  }

  /** Set inventory: pass single number to apply to all items, or array of quantities (one per inventory item id). */
  private async setInventoryLevels(inventoryItemIds: string[], quantityOrQuantities: number | number[]) {
    try {
      const locationQuery = `#graphql
        query {
          locations(first: 1) {
            edges {
              node {
                id
              }
            }
          }
        }
      `;
      const locResponse = await this.admin.graphql(locationQuery);
      const locJson = await locResponse.json();
      const locationId = locJson.data?.locations?.edges[0]?.node?.id;

      if (!locationId) return;

      const setQuantityMutation = `#graphql
        mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
          inventorySetQuantities(input: $input) {
            userErrors {
              field
              message
            }
          }
        }
      `;

      const isArray = Array.isArray(quantityOrQuantities);
      const quantities = inventoryItemIds.map((_, i) =>
        isArray ? (quantityOrQuantities as number[])[i] ?? 0 : (quantityOrQuantities as number)
      );

      await this.admin.graphql(setQuantityMutation, {
        variables: {
          input: {
            reason: "correction",
            name: "available",
            quantities: inventoryItemIds.map((id, i) => ({
              inventoryItemId: id,
              locationId: locationId,
              quantity: quantities[i] ?? 0
            }))
          }
        }
      });
    } catch (e) {
      console.error("Error setting inventory:", e);
    }
  }

  private generateCombinations(options: { name: string; values: string[]; quantities?: number[] }[]) {
    const result: string[][] = [];
    function helper(arr: string[][], current: string[]) {
      if (current.length === arr.length) {
        result.push([...current]);
        return;
      }
      for (const val of arr[current.length]) {
        current.push(val);
        helper(arr, current);
        current.pop();
      }
    }
    helper(options.map(o => o.values), []);
    return result;
  }

  async updateInventory(productId: string, quantity: number): Promise<void> {
    // Inventory logic would follow similar GraphQL patterns
    console.log(`Updating inventory for ${productId} to ${quantity}`);
  }

  async getShopInfo(): Promise<{ name: string; currencyCode: string; myshopifyDomain: string }> {
    const query = `#graphql
      query {
        shop {
          name
          currencyCode
          myshopifyDomain
        }
      }
    `;
    const response = await this.admin.graphql(query);
    const { data } = await response.json();
    return data.shop;
  }

  private async uploadBase64Image(base64Data: string): Promise<string | null> {
    const match = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return null;

    const mimeType = match[1];
    const base64Body = match[2];
    const extension = mimeType.split("/")[1];
    const fileName = `capture-${Date.now()}.${extension}`;
    const fileSize = Buffer.from(base64Body, "base64").length;

    // 1. Get staged upload details
    const stagedUploadMutation = `#graphql
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters {
              name
              value
            }
          }
        }
      }
    `;

    const stagedResponse = await this.admin.graphql(stagedUploadMutation, {
      variables: {
        input: [{
          resource: "IMAGE",
          filename: fileName,
          mimeType: mimeType,
          fileSize: fileSize.toString(),
          httpMethod: "POST"
        }]
      }
    });

    const stagedJson = await stagedResponse.json();
    const target = stagedJson.data?.stagedUploadsCreate?.stagedTargets?.[0];

    if (!target) return null;

    // 2. Upload to the signed URL
    const formData = new FormData();
    target.parameters.forEach((param: any) => {
      formData.append(param.name, param.value);
    });

    // Node 18+ has File, but we can also use Blob
    const buffer = Buffer.from(base64Body, "base64");
    const file = new Blob([buffer], { type: mimeType });
    formData.append("file", file, fileName);

    const uploadResponse = await fetch(target.url, {
      method: "POST",
      body: formData
    });

    if (!uploadResponse.ok) {
      console.error("Staged upload failed:", await uploadResponse.text());
      return null;
    }

    return target.resourceUrl;
  }
}
