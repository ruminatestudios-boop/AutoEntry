import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getConnectedStores } from '../db/tokens.js';

const storesRouter = Router();

storesRouter.get('/connected-stores', authMiddleware, async (req, res) => {
  try {
    const stores = await getConnectedStores(req.userId);
    res.json(stores);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export { storesRouter };
