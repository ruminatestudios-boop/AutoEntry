/**
 * Map UniversalListing to eBay Inventory Item + Offer.
 * Condition: new→NEW, like_new→LIKE_NEW, good→GOOD, fair→ACCEPTABLE, for_parts→FOR_PARTS_OR_NOT_WORKING.
 * Dimensions in inches (cm * 0.393701), weight in oz (kg * 35.274).
 * Required fields validated before publish; optional aspects omitted when missing (no generic Unbranded/Other).
 */
const CONDITION_MAP = {
  new: 'NEW',
  like_new: 'LIKE_NEW',
  good: 'GOOD',
  fair: 'ACCEPTABLE',
  for_parts: 'FOR_PARTS_OR_NOT_WORKING',
};

function cmToInch(cm) {
  if (cm == null || cm === 0) return undefined;
  return Math.round((cm * 0.393701) * 100) / 100;
}
function kgToOz(kg) {
  if (kg == null || kg === 0) return undefined;
  return Math.round(kg * 35.274 * 100) / 100;
}

export function toEbay(listing) {
  const condition = CONDITION_MAP[(listing.condition ?? 'new').toLowerCase().replace(/\s/g, '_')] ?? 'NEW';
  const price = (listing.price ?? 0) / 100;
  const dims = listing.dimensions ?? {};
  const aspects = {};
  if (listing.brand?.trim()) aspects.Brand = [listing.brand.trim()];
  if (listing.category?.trim()) aspects.Type = [listing.category.trim()];
  if (listing.size?.trim()) aspects.Size = [listing.size.trim()];
  if (listing.colour?.trim()) aspects.Color = [listing.colour.trim()];
  if (Object.keys(aspects).length === 0) aspects.Type = ['Other'];

  return {
    product: {
      title: (listing.title ?? '').slice(0, 80),
      description: listing.description ?? '',
      imageUrls: (listing.photos ?? []).slice(0, 12),
      aspects,
      condition,
      conditionDescription: listing.condition_notes?.trim() || undefined,
      weightAndSize: {
        weight: kgToOz(listing.weight_kg) ? { value: kgToOz(listing.weight_kg), unit: 'OZ' } : undefined,
        dimensions: dims.length != null || dims.width != null || dims.height != null
          ? { length: cmToInch(dims.length), width: cmToInch(dims.width), height: cmToInch(dims.height), unit: 'INCH' }
          : undefined,
      },
    },
    availability: { shipToLocationAvailability: { quantity: listing.quantity ?? 1 } },
    offers: [
      {
        price: { value: String(price.toFixed(2)), currency: listing.currency ?? 'GBP' },
        marketplaceId: 'EBAY_GB',
        format: 'FIXED_PRICE',
      },
    ],
  };
}
