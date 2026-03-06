import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getListingById } from '../db/listings.js';
import { toDepopText } from '../translators/depop.js';
import { toVintedText } from '../translators/vinted.js';

const exportRouter = Router();

const ALLOWED_EXPORT = ['depop', 'vinted'];

exportRouter.get('/:id/export/:platform', authMiddleware, async (req, res) => {
  try {
    const platform = (req.params.platform || '').toLowerCase();
    if (!ALLOWED_EXPORT.includes(platform)) {
      return res.status(400).json({ error: 'Platform must be depop or vinted' });
    }
    const listingRow = await getListingById(req.params.id);
    if (!listingRow) return res.status(404).json({ error: 'Listing not found' });
    if (listingRow.user_id !== req.userId) return res.status(403).json({ error: 'Not your listing' });

    const listing = listingRow.universal_data || listingRow;
    const text = platform === 'depop' ? toDepopText(listing) : toVintedText(listing);
    res.json({
      platform,
      text,
      fields_to_fill_manually: ['price', 'photos', 'category'],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export { exportRouter };
