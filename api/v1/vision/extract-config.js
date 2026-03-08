// GET-only: returns whether extraction proxy is configured (for debugging). Safe to call from browser.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ configured: false });
  const base = (process.env.AURALINK_BACKEND_URL || '').trim().replace(/\/$/, '');
  return res.status(200).json({ configured: !!base });
}
