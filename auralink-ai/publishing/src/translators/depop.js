/**
 * Depop — no API. Generate formatted text for copy-paste.
 */
export function toDepopText(listing) {
  const price = ((listing.price ?? 0) / 100).toFixed(2);
  const tags = Array.isArray(listing.tags) ? listing.tags.join(' ') : '';
  return `${listing.title || 'Untitled'}

${listing.description || ''}

Brand: ${listing.brand || '—'}
Condition: ${listing.condition || '—'}
Size: ${listing.size || '—'}
Colour: ${listing.colour || '—'}

Price: £${price}

Tags: ${tags}`.trim();
}
