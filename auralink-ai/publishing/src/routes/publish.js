import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getValidToken } from '../auth/tokenManager.js';
import { getListingById, insertListing, updateListingStatus, insertPublishResults, incrementUserListings, getUserTotalListings } from '../db/listings.js';
import { publishToShopify, publishToTikTok, publishToEbay, publishToEtsy, publishToAmazon } from '../publish/publishers.js';
import { validateListingForPlatform, getPlatformFieldsSummary } from '../config/platformFields.js';
import { getEnabledPlatforms, isPlatformEnabled } from '../config/platforms.js';

const publishRouter = Router();

/** GET enabled platforms (for UI). No auth required. */
publishRouter.get('/enabled-platforms', (_req, res) => {
  res.json({ platforms: getEnabledPlatforms() });
});

/** GET platform required/optional fields (for UI). No auth required. */
publishRouter.get('/platform-fields', (_req, res) => {
  res.json(getPlatformFieldsSummary());
});

/** POST create a draft listing from universal_data. Requires JWT. */
publishRouter.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { universal_data } = req.body || {};
    if (!universal_data || typeof universal_data !== 'object') {
      return res.status(400).json({ error: 'universal_data object required' });
    }
    const listingId = await insertListing(userId, universal_data);
    if (!listingId) return res.status(500).json({ error: 'Failed to create listing' });
    res.status(201).json({ listing_id: listingId });
  } catch (e) {
    console.error('Create listing error', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

function validateListing(listing) {
  const u = listing?.universal_data || listing;
  const missing = [];
  if (!u.title?.trim()) missing.push('title');
  if (!u.description?.trim()) missing.push('description');
  if (u.price == null || u.price < 0) missing.push('price');
  if (!Array.isArray(u.photos) || u.photos.length === 0) missing.push('photos');
  return missing;
}

publishRouter.post('/publish', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { listing_id, platforms } = req.body || {};
    if (!listing_id || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ error: 'listing_id and platforms array required' });
    }

    const listingRow = await getListingById(listing_id);
    if (!listingRow) return res.status(404).json({ error: 'Listing not found' });
    if (listingRow.user_id !== userId) return res.status(403).json({ error: 'Not your listing' });

    const listing = listingRow.universal_data || listingRow;
    const missing = validateListing(listingRow);
    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', fields: missing });
    }

    const publishJobs = platforms.map(async (platform) => {
      if (!isPlatformEnabled(platform)) {
        return { status: 'rejected', reason: 'Platform not enabled' };
      }
      const platformValidation = validateListingForPlatform(listingRow, platform);
      if (!platformValidation.valid) {
        return {
          success: false,
          error: `Missing required fields for ${platform}: ${platformValidation.missing.join(', ')}`,
          status: 'validation_error',
          fields: platformValidation.missing,
        };
      }
      try {
        const { accessToken, row } = await getValidToken(userId, platform);
        switch (platform) {
          case 'shopify': return await publishToShopify(listing, accessToken, row);
          case 'tiktok': return await publishToTikTok(listing, accessToken, row);
          case 'ebay': return await publishToEbay(listing, accessToken, row);
          case 'etsy': return await publishToEtsy(listing, accessToken, row);
          case 'amazon': return await publishToAmazon(listing, accessToken, row);
          default: throw new Error('Unknown platform');
        }
      } catch (e) {
        if (e.code === 'AUTH_ERROR' || e.code === 'NOT_CONNECTED') {
          return { auth_error: true, platform: e.platform || platform, error: e.message };
        }
        throw e;
      }
    });

    const results = await Promise.allSettled(publishJobs);
    const platformResults = {};
    platforms.forEach((platform, index) => {
      const r = results[index];
      if (r.status === 'fulfilled') {
        const v = r.value;
        if (v?.auth_error) {
          platformResults[platform] = { success: false, error: v.error, status: 'auth_error', platform: v.platform };
        } else if (v?.status === 'validation_error') {
          platformResults[platform] = {
            success: false,
            error: v.error ?? 'Missing required fields',
            status: 'validation_error',
            fields: v.fields ?? [],
          };
        } else {
          platformResults[platform] = {
            success: true,
            url: v?.url ?? null,
            platform_listing_id: v?.listing_id ?? null,
            error: null,
          };
        }
      } else {
        platformResults[platform] = {
          success: false,
          url: null,
          platform_listing_id: null,
          error: r.reason?.message || 'Unknown error',
          status: r.reason?.code === 'AUTH_ERROR' ? 'auth_error' : 'platform_error',
        };
      }
    });

    await insertPublishResults(listing_id, platformResults);
    const allFailed = Object.values(platformResults).every((r) => !r.success);
    await updateListingStatus(listing_id, allFailed ? 'failed' : 'published', platformResults);
    await incrementUserListings(userId);
    const totalListings = await getUserTotalListings(userId);

    res.json({
      success: true,
      results: platformResults,
      is_first_listing: totalListings === 1,
    });
  } catch (e) {
    console.error('Publish error', { userId: req.userId, listingId: req.body?.listing_id, error: e.message });
    res.status(500).json({ error: e.message || 'Publish failed' });
  }
});

export { publishRouter };
