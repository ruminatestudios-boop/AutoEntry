/** Build absolute frontend URL with query params (never double-`?`). */
export function buildFrontendRedirect(base, pathname, params = {}) {
  const root = String(base || '').replace(/\/$/, '') || 'https://app.synclyst.app';
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const u = new URL(path, root);
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue;
    u.searchParams.set(key, String(value));
  }
  return u.toString();
}
