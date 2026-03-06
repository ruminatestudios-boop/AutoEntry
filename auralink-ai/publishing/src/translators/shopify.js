/**
 * Map UniversalListing (pence, cm, kg) to production-ready Shopify Product API shape.
 * - Inventory: track_quantity via inventory_management, auto-SKU [BRAND]-[CATEGORY]-[3 RANDOM].
 * - Multi-variant: listing.variant_options (Size, Color) or listing.variants → options + variants.
 * - SEO 2026: alt <125 chars (no "Image of"), meta title ≤60, meta description ≤155.
 * - Product type: mapped to standard Shopify hierarchy (e.g. Apparel > Tops > T-Shirts).
 * - Image: metafield instruction for WebP conversion where applicable.
 */
const DEFAULT_METAFIELD_TYPE = 'single_line_text_field';
const METAFIELD_TYPES = new Set([
  'single_line_text_field', 'multi_line_text_field', 'number_integer', 'number_decimal',
  'date', 'date_time', 'boolean', 'json', 'url', 'color', 'rating',
]);

const PRODUCT_TYPE_MAP = {
  't-shirt': 'Apparel > Tops > T-Shirts',
  'tshirt': 'Apparel > Tops > T-Shirts',
  'tee': 'Apparel > Tops > T-Shirts',
  'shorts': 'Apparel > Bottoms > Shorts',
  'hoodie': 'Apparel > Tops > Hoodies',
  'sweatshirt': 'Apparel > Tops > Hoodies',
  'jumper': 'Apparel > Tops > Sweaters',
  'sweater': 'Apparel > Tops > Sweaters',
  'jacket': 'Apparel > Outerwear > Jackets',
  'trousers': 'Apparel > Bottoms > Trousers',
  'pants': 'Apparel > Bottoms > Trousers',
  'jeans': 'Apparel > Bottoms > Jeans',
  'dress': 'Apparel > Dresses',
  'top': 'Apparel > Tops',
  'bottoms': 'Apparel > Bottoms',
  'footwear': 'Footwear',
  'trainers': 'Footwear > Trainers',
  'shoes': 'Footwear > Shoes',
  'accessories': 'Accessories',
  'equipment': 'Sports & Outdoors > Equipment',
};

function mapProductType(categoryOrType) {
  const raw = (categoryOrType || '').toString().toLowerCase().trim().replace(/\s+/g, ' ');
  if (!raw) return '';
  const key = Object.keys(PRODUCT_TYPE_MAP).find((k) => raw.includes(k) || raw === k);
  return key ? PRODUCT_TYPE_MAP[key] : (categoryOrType || '').toString().trim().slice(0, 255);
}

/** Auto-SKU: [BRAND]-[CATEGORY]-[3 RANDOM]. Sanitize to alphanumeric + hyphen. */
function generateSku(listing, suffix = '') {
  const brand = (listing.brand || listing.vendor || 'GEN')
    .toString()
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase()
    .slice(0, 20) || 'GEN';
  const category = (listing.category || listing.product_type || 'PROD')
    .toString()
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase()
    .slice(0, 20) || 'PROD';
  const rand = suffix || Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${brand}-${category}-${rand}`;
}

/** Concise alt text <125 chars: describe physical attributes, no "Image of". */
function imageAltText(listing, index, total) {
  const title = (listing.title || 'Product').trim();
  const type = listing.product_type || listing.category || 'apparel';
  const part = total > 1 ? `, view ${index + 1} of ${total}` : '';
  const alt = `${title}, ${type}${part}`.slice(0, 125);
  return alt || 'Product image';
}

function cartesianProduct(arrays) {
  if (arrays.length === 0) return [[]];
  const [first, ...rest] = arrays;
  const restProduct = cartesianProduct(rest);
  return first.flatMap((v) => restProduct.map((r) => [v, ...r]));
}

/**
 * Build options and variants from listing.variant_options (flow-3) or listing.variants (legacy).
 * Inventory: track_quantity true (inventory_management: 'shopify'), map quantity to default location via inventory_quantity.
 * Auto-SKU when missing: [BRAND]-[CATEGORY]-[3 RANDOM] per variant.
 */
function buildOptionsAndVariants(listing) {
  const variantOptions = listing.variant_options;
  const defaultPrice = (listing.price ?? 0) / 100;
  const totalQty = Math.max(1, Number(listing.quantity) ?? 1);
  const weightGrams = (listing.weight_kg != null && listing.weight_kg > 0) ? listing.weight_kg * 1000 : 500;

  if (Array.isArray(variantOptions) && variantOptions.length > 0) {
    const opts = variantOptions.filter((o) => o && o.name && Array.isArray(o.values) && o.values.length > 0);
    if (opts.length > 0) {
      const optionNames = opts.map((o) => o.name);
      const valueArrays = opts.map((o) => o.values.map((v) => String(v).trim()).filter(Boolean));
      const combinations = cartesianProduct(valueArrays);
      if (combinations.length > 0) {
        const options = optionNames.map((name, i) => ({
          name,
          position: i + 1,
          values: valueArrays[i],
        }));
        const qtyPerVariant = Math.max(1, Math.floor(totalQty / combinations.length));
        const variants = combinations.map((combo, idx) => {
          const option1 = combo[0];
          const option2 = combo[1];
          const sku =
            listing.sku?.trim() ||
            generateSku(listing, String(idx + 1).padStart(3, '0').slice(-3));
          return {
            price: String(defaultPrice.toFixed(2)),
            sku,
            weight: weightGrams,
            weight_unit: 'g',
            option1,
            ...(option2 !== undefined && { option2 }),
            inventory_quantity: qtyPerVariant,
            inventory_management: 'shopify',
          };
        });
        return { options, variants };
      }
    }
  }

  const variants = listing.variants;
  if (Array.isArray(variants) && variants.length > 0) {
    const hasSize = variants.some((v) => v.size != null && String(v.size).trim() !== '');
    const hasColour = variants.some((v) => v.colour != null && String(v.colour).trim() !== '');
    const sizeValues = hasSize
      ? [...new Set(variants.map((v) => (v.size != null && String(v.size).trim() !== '' ? String(v.size).trim() : 'Default')).filter(Boolean))]
      : [];
    const colourValues = hasColour
      ? [...new Set(variants.map((v) => (v.colour != null && String(v.colour).trim() !== '' ? String(v.colour).trim() : 'Default')).filter(Boolean))]
      : [];
    const options = [];
    if (sizeValues.length > 0) options.push({ name: 'Size', values: sizeValues });
    if (colourValues.length > 0) options.push({ name: 'Color', values: colourValues });
    if (options.length === 0) {
      options.push({ name: 'Variant', values: variants.map((_, i) => `Variant ${i + 1}`) });
    }
    const shopifyVariants = variants.map((v, i) => {
      const price = v.price != null ? v.price / 100 : defaultPrice;
      const option1 =
        options[0]?.name === 'Size'
          ? (v.size?.trim() || 'Default')
          : options[0]?.name === 'Color'
            ? (v.colour?.trim() || 'Default')
            : options[0]
              ? `Variant ${i + 1}`
              : undefined;
      const option2 =
        options[1]?.name === 'Color'
          ? (v.colour?.trim() || 'Default')
          : options[1]?.name === 'Size'
            ? (v.size?.trim() || 'Default')
            : undefined;
      const sku =
        v.sku?.trim() ||
        listing.sku?.trim() ||
        generateSku(listing, String(i + 1).padStart(3, '0').slice(-3));
      return {
        price: String(price.toFixed(2)),
        sku,
        weight: weightGrams,
        weight_unit: 'g',
        ...(option1 !== undefined && { option1 }),
        ...(option2 !== undefined && { option2 }),
        inventory_quantity: Math.max(1, v.quantity ?? listing.quantity ?? 1),
        inventory_management: 'shopify',
      };
    });
    return { options, variants: shopifyVariants };
  }

  const sku =
    listing.sku?.trim() || generateSku(listing);
  const weightGrams = (listing.weight_kg != null && listing.weight_kg > 0) ? listing.weight_kg * 1000 : 500;
  return {
    options: [],
    variants: [
      {
        price: String(defaultPrice.toFixed(2)),
        sku,
        weight: weightGrams,
        weight_unit: 'g',
        option1: listing.size ?? undefined,
        inventory_quantity: totalQty,
        inventory_management: 'shopify',
      },
    ],
  };
}

function mapMetafields(listing) {
  const raw = listing.metafields;
  const out = [];
  if (Array.isArray(raw)) {
    for (const m of raw) {
      if (!m || m.namespace == null || m.key == null || m.value === undefined || m.value === null) continue;
      const type = METAFIELD_TYPES.has(m.type) ? m.type : DEFAULT_METAFIELD_TYPE;
      let value = m.value;
      if (type !== 'single_line_text_field' && type !== 'multi_line_text_field' && typeof value !== 'string') {
        value = String(value);
      }
      out.push({
        namespace: String(m.namespace).slice(0, 20),
        key: String(m.key).slice(0, 30),
        value: String(value),
        type,
      });
    }
  }
  const metaTitle = (listing.meta_title || listing.title || '').toString().trim().slice(0, 60);
  const metaDesc = (listing.meta_description || listing.description || '')
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 155);
  if (metaTitle) {
    out.push({
      namespace: 'global',
      key: 'title_tag',
      value: metaTitle,
      type: 'single_line_text_field',
    });
  }
  if (metaDesc) {
    out.push({
      namespace: 'global',
      key: 'description_tag',
      value: metaDesc,
      type: 'single_line_text_field',
    });
  }
  out.push({
    namespace: 'auto_entry',
    key: 'image_format',
    value: 'webp',
    type: 'single_line_text_field',
  });
  return out;
}

export function toShopify(listing) {
  const description = [
    listing.description ?? '',
    listing.condition_notes ? `Condition notes: ${listing.condition_notes}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
  const tagsStr = Array.isArray(listing.tags) ? listing.tags.slice(0, 250).join(', ') : '';
  const { options, variants } = buildOptionsAndVariants(listing);
  const metafields = mapMetafields(listing);
  const productType = mapProductType(listing.product_type || listing.category) || (listing.product_type || listing.category || '').toString().trim().slice(0, 255);
  const photos = (listing.photos ?? []).slice(0, 250);
  const totalImages = photos.length;

  const product = {
    title: (listing.title ?? '').slice(0, 255),
    body_html: description,
    vendor: (listing.brand ?? listing.vendor ?? '').slice(0, 255),
    product_type: productType,
    tags: tagsStr,
    variants,
    images: photos.map((src, i) => {
      const img = typeof src === 'string' ? { src } : { src: src.url || src.src || src };
      img.alt = imageAltText(listing, i, totalImages);
      return img;
    }),
    status: 'draft',
  };
  if (options.length > 0) product.options = options;

  const result = { product };
  if (metafields.length > 0) result.metafields = metafields;
  return result;
}

/**
 * Build GraphQL productCreate input (ProductCreateInput) for the same listing.
 * Use this when calling Shopify Admin GraphQL API instead of REST.
 */
export function toShopifyGraphQLProductInput(listing) {
  const payload = toShopify(listing);
  const p = payload.product;
  return {
    title: p.title,
    descriptionHtml: p.body_html,
    vendor: p.vendor || undefined,
    productType: p.product_type || undefined,
    status: 'DRAFT',
    options: p.options?.map((o) => ({ name: o.name, values: o.values?.map((v) => v.name) ?? [] })) ?? [],
    variants: p.variants?.map((v) => ({
      price: v.price,
      sku: v.sku,
      weight: v.weight,
      weightUnit: 'GRAMS',
      optionValues: [v.option1, v.option2].filter(Boolean).map((val, i) => ({ optionName: p.options?.[i]?.name ?? 'Option', name: val })),
      inventoryQuantities: v.inventory_quantity != null ? [{ availableQuantity: v.inventory_quantity }] : undefined,
    })),
    media: p.images?.map((img) => ({
      originalSource: img.src,
      alt: img.alt || undefined,
    })),
    metafields: payload.metafields?.map((m) => ({
      namespace: m.namespace,
      key: m.key,
      value: m.value,
      type: m.type,
    })),
  };
}
