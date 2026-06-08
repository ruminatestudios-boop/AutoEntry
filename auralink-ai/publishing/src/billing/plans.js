/** Shopify App Billing plans (must match App Store listing & synclyst.app/billing). */
export const BILLING_PLANS = {
  pro: {
    tier: 'pro',
    name: 'SyncLyst Pro',
    amount: 9.99,
    currencyCode: 'USD',
    interval: 'EVERY_30_DAYS',
    blurb: 'For sellers getting started on Shopify.',
  },
  growth: {
    tier: 'growth',
    name: 'SyncLyst Growth',
    amount: 29.99,
    currencyCode: 'USD',
    interval: 'EVERY_30_DAYS',
    blurb: 'For active sellers listing regularly.',
  },
  scale: {
    tier: 'scale',
    name: 'SyncLyst Scale',
    amount: 79.99,
    currencyCode: 'USD',
    interval: 'EVERY_30_DAYS',
    blurb: 'For high-volume sellers and growing stores.',
  },
};

export const PAID_TIERS = ['pro', 'growth', 'scale'];

export function isPaidTier(tier) {
  return PAID_TIERS.includes(String(tier || '').toLowerCase());
}

export function planForTier(tier) {
  return BILLING_PLANS[String(tier || '').toLowerCase()] || null;
}

/** Map Shopify subscription name / tier key → internal tier. */
export function tierFromSubscriptionName(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('scale')) return 'scale';
  if (n.includes('growth')) return 'growth';
  if (n.includes('pro')) return 'pro';
  return null;
}
