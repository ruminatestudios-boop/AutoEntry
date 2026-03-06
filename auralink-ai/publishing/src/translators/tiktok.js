/**
 * Map UniversalListing to TikTok Shop product shape.
 * Aligned with TikTok Shop Academy: https://seller-us.tiktok.com/university/essay?knowledge_id=6581713858676522
 * Basic info: images (1–9), product name (25–200 chars), category. Product details: description. Sales: price, quantity per variant.
 * Condition required in flow; passed when API supports it. Price in minor units (pence).
 */
const CATEGORY_MAP = {
  electronics: '174000',
  clothing: '174001',
  home: '174002',
  sports: '174003',
  toys: '174004',
  books: '174005',
  beauty: '174006',
  garden: '174007',
  other: '174009',
};

/** Map universal condition to TikTok-style condition (for description or future API field). */
function toTikTokCondition(c) {
  const v = (c ?? 'new').toLowerCase();
  if (v.includes('used') || v === 'pre-owned') return 'Used';
  if (v.includes('defect')) return 'New with defects';
  if (v.includes('tag')) return 'New with tags';
  return v === 'new' ? 'New without tags' : 'New without tags';
}

export function toTikTok(listing) {
  const cat = (listing.category ?? 'other').toLowerCase().replace(/\s+/g, '_');
  const categoryId = CATEGORY_MAP[cat] ?? CATEGORY_MAP.other;
  const price = listing.price ?? 0; // pence
  const sellerSku = listing.sku?.trim() || undefined;
  const title = (listing.title ?? '').trim().slice(0, 200); // TikTok: 25–200 chars
  const condition = toTikTokCondition(listing.condition);
  const description = listing.description ?? '';
  const descriptionWithCondition = condition ? `${description}\n\nCondition: ${condition}`.trim() : description;
  return {
    product_name: title,
    description: descriptionWithCondition,
    category_id: categoryId,
    price: price,
    images: (listing.photos ?? []).slice(0, 9).map((url) => ({ url })),
    skus: [
      {
        seller_sku: sellerSku ?? `aul-${Date.now()}`,
        price: price,
        stock_infos: [{ warehouse_id: 'default', quantity: listing.quantity ?? 1 }],
      },
    ],
  };
}
