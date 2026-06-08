import jwt from 'jsonwebtoken';

function publishingJwtSecrets() {
  const seen = new Set();
  const out = [];
  for (const raw of [
    process.env.JWT_SECRET,
    process.env.PUBLISHING_JWT_SECRET,
    process.env.NODE_ENV !== 'production' ? 'dev-secret-change-in-production' : null,
  ]) {
    const s = (raw || '').trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function verifyPublishingJwt(token) {
  const secrets = publishingJwtSecrets();
  let lastErr = null;
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Invalid or expired token');
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.query?.token;
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid authorization' });
  }
  try {
    const decoded = verifyPublishingJwt(token);
    req.user = decoded;
    req.userId = decoded.sub || decoded.userId || decoded.id;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
