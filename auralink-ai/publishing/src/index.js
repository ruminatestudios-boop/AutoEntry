/**
 * SyncLyst Publishing API — Express app
 * OAuth, token refresh, universal → platform translation, publish orchestration.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { publishRouter } from './routes/publish.js';
import { storesRouter } from './routes/stores.js';
import { exportRouter } from './routes/export.js';

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const allowedOrigins = FRONTEND_URL.includes(',')
  ? FRONTEND_URL.split(',').map((u) => u.trim()).filter(Boolean)
  : [FRONTEND_URL];
// Ensure production frontend is allowed when running on Cloud Run (in case FRONTEND_URL is unset)
const isCloudRun = /\.run\.app$/i.test(process.env.APP_URL || '');
if (isCloudRun) {
  const prod = ['https://synclyst.app', 'https://www.synclyst.app'];
  prod.forEach((o) => { if (!allowedOrigins.includes(o)) allowedOrigins.push(o); });
}
const allowAllOrigins = process.env.NODE_ENV !== 'production';

function corsHeaders(req, res, next) {
  const origin = req.headers.origin;
  const isSynclystProd = origin === 'https://synclyst.app' || origin === 'https://www.synclyst.app';
  const allowOrigin = origin && (isSynclystProd || allowAllOrigins || allowedOrigins.includes(origin)) ? origin : null;
  if (allowOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
}
app.use(corsHeaders);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (origin === 'https://synclyst.app' || origin === 'https://www.synclyst.app') return cb(null, origin);
    if (allowedOrigins[0] === true) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, origin);
    cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
}));
app.use(express.json());

app.get('/auth/shopify/status', (req, res) => {
  const configured = !!(process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET);
  const appUrl = process.env.APP_URL || 'http://localhost:8001';
  const redirectUri = `${appUrl.replace(/\/$/, '')}/auth/shopify/callback`;
  res.json({ shopify_configured: configured, redirect_uri: redirectUri });
});
app.use('/auth', authRouter);
app.use('/api/listings', publishRouter);
app.use('/api/user', storesRouter);
app.use('/api/listings', exportRouter);

app.get('/', (req, res) => {
  res.json({
    service: 'synclyst-publishing-api',
    message: 'Publishing API is running. Use these endpoints:',
    endpoints: {
      health: 'GET /health',
      enabledPlatforms: 'GET /api/listings/enabled-platforms',
      platformFields: 'GET /api/listings/platform-fields',
      listListings: 'GET /api/listings (JWT)',
      createListing: 'POST /api/listings (body: universal_data)',
      publish: 'POST /api/listings/publish',
      connectedStores: 'GET /api/user/connected-stores',
      shopifyAuth: 'GET /auth/shopify?shop=your-store.myshopify.com',
    },
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'synclyst-publishing-api' });
});

const PORT = process.env.PORT || 8001;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Publishing API listening on http://${HOST}:${PORT}`);
});

export default app;
