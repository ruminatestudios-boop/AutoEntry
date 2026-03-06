/**
 * Map UniversalListing to Amazon SP-API Listings Item.
 * Required fields (title, description, price, photos, brand) validated before publish; no generic placeholders.
 * UPC/EAN optional; omit when missing.
 */
export function toAmazon(listing) {
  const price = (listing.price ?? 0) / 100;
  const attributes = {
    condition_type: [{ value: (listing.condition ?? 'new').toUpperCase().replace(/\s/g, '_'), marketplace_id: 'A1F83G8C2ARO7P' }],
    item_name: [{ value: (listing.title ?? '').slice(0, 200), language_tag: 'en_GB', marketplace_id: 'A1F83G8C2ARO7P' }],
    product_description: [{ value: listing.description ?? '', language_tag: 'en_GB', marketplace_id: 'A1F83G8C2ARO7P' }],
    brand: listing.brand?.trim() ? [{ value: listing.brand.trim(), marketplace_id: 'A1F83G8C2ARO7P' }] : undefined,
    item_type_keyword: listing.category?.trim() ? [{ value: listing.category.trim(), marketplace_id: 'A1F83G8C2ARO7P' }] : undefined,
    list_price: [{ value: price.toFixed(2), currency: listing.currency ?? 'GBP', marketplace_id: 'A1F83G8C2ARO7P' }],
    quantity: [{ value: String(listing.quantity ?? 1), marketplace_id: 'A1F83G8C2ARO7P' }],
    upc: listing.upc?.trim() || listing.ean?.trim() ? [{ value: (listing.upc || listing.ean).trim(), marketplace_id: 'A1F83G8C2ARO7P' }] : undefined,
    bullet_point: Array.isArray(listing.tags) && listing.tags.length > 0 ? listing.tags.slice(0, 5).map((t) => ({ value: String(t), language_tag: 'en_GB', marketplace_id: 'A1F83G8C2ARO7P' })) : undefined,
  };
  const clean = Object.fromEntries(Object.entries(attributes).filter(([, v]) => v != null && (typeof v !== 'object' || (Array.isArray(v) ? v.length : Object.keys(v).length))));
  return {
    productType: 'PRODUCT',
    requirements: 'LISTING',
    attributes: clean,
  };
}
