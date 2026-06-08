import { getSupabase } from './client.js';
import { getValidToken } from '../auth/tokenManager.js';
import {
  fetchActiveSubscriptions,
  pickBestSubscription,
  subscriptionToBillingState,
} from '../billing/shopifyBilling.js';
import { isPaidTier } from '../billing/plans.js';
import { isClerkUserId } from './tokens.js';

function billingClerkId(userId, tokenRow) {
  if (isClerkUserId(userId)) return userId;
  const fromRow = tokenRow?.clerk_user_id;
  if (fromRow && isClerkUserId(fromRow)) return fromRow;
  return null;
}

function billingSkipEnabled() {
  if (process.env.NODE_ENV === 'production') {
    if (/^(1|true|yes)$/i.test(process.env.BILLING_SKIP || '')) {
      console.error('[billing] BILLING_SKIP is set in production — ignored; publish requires paid plan');
    }
    return false;
  }
  const skip = /^(1|true|yes)$/i.test(process.env.BILLING_SKIP || '');
  const allowDev = /^(1|true|yes)$/i.test(process.env.ALLOW_DEV_BILLING_SKIP || '');
  if (skip && !allowDev) {
    console.warn(
      '[billing] BILLING_SKIP ignored — set ALLOW_DEV_BILLING_SKIP=1 for local publish testing without a subscription'
    );
    return false;
  }
  return skip && allowDev;
}

export async function upsertUserBillingFromShopify(userId, state) {
  const db = getSupabase();
  if (!db || !userId) return;
  const now = new Date().toISOString();
  const row = {
    clerk_user_id: userId,
    tier: state.tier || 'starter',
    status: state.status || 'inactive',
    updated_at: now,
  };
  if (state.shopify_subscription_id) {
    row.stripe_subscription_id = state.shopify_subscription_id;
  }
  if (state.current_period_end) {
    row.current_period_end = state.current_period_end;
  }
  try {
    await db.from('user_billing').upsert(row, { onConflict: 'clerk_user_id' });
  } catch (e) {
    console.warn('[billing] upsert user_billing failed', e.message);
  }
}

/** Pull active Shopify subscription for this user and mirror to user_billing. */
export async function syncShopifyBillingForUser(userId) {
  if (billingSkipEnabled()) {
    return { tier: 'pro', status: 'active', source: 'billing_skip' };
  }
  try {
    const { accessToken, row } = await getValidToken(userId, 'shopify');
    const shop = row?.shop_domain;
    if (!shop || !accessToken) {
      return { tier: 'starter', status: 'inactive', source: 'not_connected' };
    }
    const subs = await fetchActiveSubscriptions(shop, accessToken);
    const best = pickBestSubscription(subs);
    const state = subscriptionToBillingState(best);
    const clerkId = billingClerkId(userId, row);
    if (clerkId) {
      await upsertUserBillingFromShopify(clerkId, state);
    } else {
      console.warn('[billing] sync: no clerk_user_id for user_billing upsert', userId);
    }
    return { ...state, shop_domain: shop, source: 'shopify' };
  } catch (e) {
    console.warn('[billing] sync failed for user', userId, e.message);
    return { tier: 'starter', status: 'inactive', source: 'error', error: e.message };
  }
}

export async function getUserBillingState(userId) {
  if (billingSkipEnabled()) {
    return { tier: 'pro', status: 'active', can_publish: true, billing_provider: 'skip' };
  }

  const synced = await syncShopifyBillingForUser(userId);

  const db = getSupabase();
  if (!db) {
    return { tier: 'starter', status: 'inactive', can_publish: false, billing_provider: 'none' };
  }

  try {
    const { data } = await db
      .from('user_billing')
      .select('tier,status,stripe_subscription_id,updated_at')
      .eq('clerk_user_id', userId)
      .limit(1)
      .maybeSingle();

    const tier = (data?.tier || 'starter').toLowerCase();
    const status = (data?.status || 'inactive').toLowerCase();
    const paid = isPaidTier(tier) && (status === 'active' || status === 'trialing');
    return {
      tier,
      status,
      can_publish: paid,
      shopify_subscription_id: data?.stripe_subscription_id || null,
      shop_domain: synced?.shop_domain || null,
      billing_provider: 'shopify',
      updated_at: data?.updated_at || null,
    };
  } catch (e) {
    return { tier: 'starter', status: 'inactive', can_publish: false, billing_provider: 'shopify' };
  }
}

export async function assertCanPublish(userId) {
  const state = await getUserBillingState(userId);
  if (state.can_publish) return state;
  const err = new Error('Active SyncLyst subscription required. Upgrade via Shopify Billing.');
  err.code = 'BILLING_REQUIRED';
  err.billing = state;
  throw err;
}
