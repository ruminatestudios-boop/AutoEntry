import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Shopify App Store apps must bill through Shopify Billing API, not Stripe.
 * Paid checkout is handled via /billing → publishing POST /api/billing/subscribe.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "use_shopify_billing",
      message: "Subscribe at /billing — paid plans are billed through Shopify on your connected store.",
    },
    { status: 410 }
  );
}
