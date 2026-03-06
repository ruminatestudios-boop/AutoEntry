/**
 * AuraLink Publishing API — Express app
 * OAuth, token refresh, universal → platform translation, publish orchestration.
 */
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { publishRouter } from './routes/publish.js';
import { storesRouter } from './routes/stores.js';
import { exportRouter } from './routes/export.js';

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const corsOrigin = process.env.NODE_ENV === 'production'
  ? (FRONTEND_URL.includes(',') ? FRONTEND_URL.split(',').map((u) => u.trim()) : FRONTEND_URL)
  : true; // allow any origin in development (e.g. phone at http://192.168.x.x:3000)
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

app.use('/auth', authRouter);
app.use('/api/listings', publishRouter);
app.use('/api/user', storesRouter);
app.use('/api/listings', exportRouter);

app.get('/', (req, res) => {
  res.json({
    service: 'auralink-publishing-api',
    message: 'Publishing API is running. Use these endpoints:',
    endpoints: {
      health: 'GET /health',
      enabledPlatforms: 'GET /api/listings/enabled-platforms',
      platformFields: 'GET /api/listings/platform-fields',
      createListing: 'POST /api/listings (body: universal_data)',
      publish: 'POST /api/listings/publish',
      connectedStores: 'GET /api/user/connected-stores',
      shopifyAuth: 'GET /auth/shopify?shop=your-store.myshopify.com',
    },
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auralink-publishing-api' });
});

const PORT = process.env.PORT || 8001;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Publishing API listening on http://${HOST}:${PORT}`);
});

export default app;
