/**
 * Map UniversalListing to Etsy CreateListing.
 * price: { amount: pence, divisor: 100, currency_code: "GBP" }
 * tags: max 13. category required (Etsy "What kind of item is it?"); required fields validated before publish.
 */
const TAXONOMY_MAP = {
  electronics: 69150469,
  clothing: 115280774,
  home: 69150468,
  sports: 115280782,
  toys: 115280781,
  books: 69150470,
  beauty: 115280775,
  garden: 115280778,
  other: 69150468,
};

export function toEtsy(listing) {
  const cat = (listing.category ?? 'other').toLowerCase().replace(/\s+/g, '_');
  return {
    title: (listing.title ?? '').slice(0, 140),
    description: listing.description ?? '',
    price: {
      amount: listing.price ?? 0,
      divisor: 100,
      currency_code: listing.currency ?? 'GBP',
    },
    quantity: listing.quantity ?? 1,
    tags: (listing.tags ?? []).slice(0, 13),
    who_made: 'i_did',
    when_made: (listing.condition === 'new' || !listing.condition) ? '2020_2025' : 'made_to_order',
    is_supply: false,
    taxonomy_id: TAXONOMY_MAP[cat] ?? TAXONOMY_MAP.other,
    state: 'draft',
    image_ids: [], // Etsy expects upload first, then pass image IDs
  };
}
