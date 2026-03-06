/**
 * Vinted — no API. Generate formatted text for copy-paste.
 */
export function toVintedText(listing) {
  const price = ((listing.price ?? 0) / 100).toFixed(2);
  return `${listing.title || 'Untitled'}

${listing.description || ''}

Brand: ${listing.brand || '—'}
Size: ${listing.size || '—'}
Colour: ${listing.colour || '—'}
Condition: ${listing.condition || '—'}
${listing.condition_notes ? 'Notes: ' + listing.condition_notes : ''}

Price: £${price}`.trim();
}
