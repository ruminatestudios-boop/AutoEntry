/**
 * Map UniversalListing to Etsy CreateListing.
 * price: { amount: pence, divisor: 100, currency_code: "GBP" }
 * tags: max 13. category required (Etsy "What kind of item is it?"); required fields validated before publish.
 * who_made: i_did | member | other. when_made: made_to_order | 2020_2025 | etc. is_supply: boolean.
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
  'art_collectibles': 69150468,
  'craft_supplies': 69150468,
  jewellery: 115280776,
  other: 69150468,
};

export function toEtsy(listing) {
  const cat = (listing.category ?? 'other').toLowerCase().replace(/\s+/g, '_').replace(/&/g, '');
  const whoMade = listing.who_made === 'member' ? 'someone_else' : (listing.who_made === 'other' ? 'collective' : 'i_did');
  const whenMade = listing.when_made || 'made_to_order';
  const isSupply = !!listing.is_supply;
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
    who_made: whoMade,
    when_made: whenMade,
    is_supply: isSupply,
    taxonomy_id: TAXONOMY_MAP[cat] ?? TAXONOMY_MAP.other,
    state: 'draft',
    image_ids: [], // Etsy expects upload first, then pass image IDs
  };
}
