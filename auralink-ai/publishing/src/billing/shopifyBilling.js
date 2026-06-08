import axios from 'axios';
import { planForTier, tierFromSubscriptionName } from './plans.js';

const API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-01';

/** Live charges on Cloud Run / production unless SHOPIFY_BILLING_TEST=1 (review stores). */
function shopifyBillingTestMode() {
  const flag = (process.env.SHOPIFY_BILLING_TEST || '').trim().toLowerCase();
  if (['1', 'true', 'yes'].includes(flag)) return true;
  if (['0', 'false', 'no'].includes(flag)) return false;
  if (process.env.NODE_ENV === 'production') return false;
  if (/\.run\.app$/i.test((process.env.APP_URL || '').trim())) return false;
  return true;
}

export async function shopifyAdminGraphql(shop, accessToken, query, variables = {}) {
  const url = `https://${shop}/admin/api/${API_VERSION}/graphql.json`;
  const { data } = await axios.post(
    url,
    { query, variables },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      timeout: 20000,
    }
  );
  if (Array.isArray(data?.errors) && data.errors.length) {
    const msg = data.errors.map((e) => e.message).filter(Boolean).join('; ');
    throw new Error(msg || 'Shopify GraphQL error');
  }
  return data?.data;
}

const ACTIVE_SUBSCRIPTIONS_QUERY = `
  query SyncLystActiveSubscriptions {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
        test
        currentPeriodEnd
        lineItems {
          plan {
            pricingDetails {
              ... on AppRecurringPricing {
                price { amount currencyCode }
                interval
              }
            }
          }
        }
      }
    }
  }
`;

const SUBSCRIPTION_CREATE = `
  mutation SyncLystAppSubscriptionCreate(
    $name: String!
    $returnUrl: URL!
    $test: Boolean
    $lineItems: [AppSubscriptionLineItemInput!]!
    $replacementBehavior: AppSubscriptionReplacementBehavior
  ) {
    appSubscriptionCreate(
      name: $name
      returnUrl: $returnUrl
      test: $test
      lineItems: $lineItems
      replacementBehavior: $replacementBehavior
    ) {
      confirmationUrl
      appSubscription { id status name }
      userErrors { field message }
    }
  }
`;

export async function fetchActiveSubscriptions(shop, accessToken) {
  const data = await shopifyAdminGraphql(shop, accessToken, ACTIVE_SUBSCRIPTIONS_QUERY);
  return data?.currentAppInstallation?.activeSubscriptions || [];
}

export function pickBestSubscription(subscriptions) {
  const active = (subscriptions || []).filter((s) =>
    ['ACTIVE', 'PENDING', 'ACCEPTED'].includes(String(s?.status || '').toUpperCase())
  );
  if (!active.length) return null;
  const order = ['scale', 'growth', 'pro'];
  let best = active[0];
  let bestRank = -1;
  for (const sub of active) {
    const tier = tierFromSubscriptionName(sub.name);
    const rank = order.indexOf(tier || '');
    if (rank > bestRank) {
      bestRank = rank;
      best = sub;
    }
  }
  return best;
}

export async function createAppSubscription(shop, accessToken, tier, returnUrl) {
  const plan = planForTier(tier);
  if (!plan) throw new Error('invalid_tier');

  const test = shopifyBillingTestMode();
  const variables = {
    name: plan.name,
    returnUrl,
    test,
    replacementBehavior: 'APPLY_IMMEDIATELY',
    lineItems: [
      {
        plan: {
          appRecurringPricingDetails: {
            price: { amount: plan.amount, currencyCode: plan.currencyCode },
            interval: plan.interval,
          },
        },
      },
    ],
  };

  const data = await shopifyAdminGraphql(shop, accessToken, SUBSCRIPTION_CREATE, variables);
  const payload = data?.appSubscriptionCreate;
  const errors = payload?.userErrors || [];
  if (errors.length) {
    throw new Error(errors.map((e) => e.message).filter(Boolean).join('; ') || 'Subscription create failed');
  }
  if (!payload?.confirmationUrl) {
    throw new Error('Shopify did not return a confirmation URL');
  }
  return {
    confirmationUrl: payload.confirmationUrl,
    subscription: payload.appSubscription,
  };
}

export function subscriptionToBillingState(subscription) {
  if (!subscription) {
    return { tier: 'starter', status: 'inactive', shopify_subscription_id: null };
  }
  const statusRaw = String(subscription.status || '').toUpperCase();
  const tier = tierFromSubscriptionName(subscription.name) || 'pro';
  const status =
    statusRaw === 'ACTIVE' || statusRaw === 'ACCEPTED'
      ? 'active'
      : statusRaw === 'PENDING'
        ? 'trialing'
        : 'inactive';
  return {
    tier,
    status,
    shopify_subscription_id: subscription.id || null,
    current_period_end: subscription.currentPeriodEnd || null,
  };
}
