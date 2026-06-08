/** First origin for OAuth redirects (FRONTEND_URL may be comma-separated for CORS). */
export function frontendBaseUrl() {
  const raw = (
    process.env.FRONTEND_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://app.synclyst.app' : 'http://localhost:3000')
  ).trim();
  const first = raw.split(',')[0].trim().replace(/\/$/, '');
  if (first.startsWith('http://') || first.startsWith('https://')) return first;
  return `https://${first}`;
}

/** All allowed frontend origins (CORS). */
export function frontendAllowedOrigins() {
  const raw = (
    process.env.FRONTEND_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://app.synclyst.app' : 'http://localhost:3000')
  ).trim();
  if (!raw.includes(',')) return [raw.replace(/\/$/, '')];
  return raw
    .split(',')
    .map((u) => u.trim().replace(/\/$/, ''))
    .filter(Boolean);
}
