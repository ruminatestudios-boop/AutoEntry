/** Title-case tag labels: each space- or hyphen-separated segment gets Capital + rest lower (e.g. PALACE → Palace, dog print → Dog Print, GORE-TEX → Gore-Tex). */
export function normalizeProductTag(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s
    .split(/\s+/)
    .map((part) =>
      part
        .split("-")
        .map((seg) => (seg.length === 0 ? seg : seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase()))
        .join("-")
    )
    .join(" ");
}

export function normalizeProductTagsList(arr: string[]): string[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of arr) {
    const n = normalizeProductTag(raw);
    if (!n) continue;
    const k = n.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(n);
  }
  return out;
}
