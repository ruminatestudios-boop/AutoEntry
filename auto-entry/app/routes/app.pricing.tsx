import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useAppBridge } from "@shopify/app-bridge-react";
import { DashboardPageLayout } from "../components/DashboardPageLayout";
import { useEffect, useRef, useState } from "react";
import { useActionData, useLoaderData, useSubmit, useSearchParams, useNavigation } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const shopSettings = await db.shopSettings.findUnique({ where: { shop } });
  return json({ shopSettings });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request) as any;
  const shop = session.shop;
  const formData = await request.formData();
  const plan = formData.get("plan") as any;
  const isTest = process.env.NODE_ENV !== "production";

  if (plan === "FREE") {
    const billingCheck = await billing.check({
      plans: ["Starter", "Growth", "Power"] as const,
      isTest,
    });

    if (billingCheck.hasActivePayment) {
      for (const subscription of billingCheck.appSubscriptions) {
        await billing.cancel({
          subscriptionId: subscription.id,
          isTest,
          prorate: true,
        });
      }
    }

    await db.shopSettings.upsert({
      where: { shop },
      update: { plan: "FREE" },
      create: { shop, plan: "FREE" }
    });

    return json({ success: true });
  }

  if (plan?.startsWith("TopUp")) {
    const topupMap: Record<string, number> = {
      "TopUp100": 100,
      "TopUp500": 500,
      "TopUp1000": 1000
    };

    const bonusScans = topupMap[plan];
    const appUrl = process.env.SHOPIFY_APP_URL || new URL(request.url).origin;
    const returnUrl = `${appUrl}/app/topup-success?scans=${bonusScans}`;

    try {
      await billing.request({
        plan: plan as any,
        isTest,
        returnUrl,
      });
    } catch (e: any) {
      if (e instanceof Response) throw e;
      console.error("PRICING ACTION: TopUp request failed:", e);
      return json({ error: "Failed to initiate purchase. Please try again." });
    }
    return null;
  }

  if (plan) {
    const appUrl = process.env.SHOPIFY_APP_URL || new URL(request.url).origin;
    const returnUrl = `${appUrl}/app`;

    try {
      await billing.request({
        plan: plan as any,
        isTest,
        returnUrl,
      });
    } catch (e: any) {
      if (e instanceof Response) throw e;

      if (process.env.NODE_ENV === "development") {
        await db.shopSettings.upsert({
          where: { shop },
          update: { plan },
          create: { shop, plan }
        });
        return json({ success: true, bypassed: true });
      }

      console.error("PRICING ACTION ERROR:", e);
      return json({ error: "Failed to initiate subscription. Please try again." });
    }
    return null;
  }
  return null;
};

export default function Pricing() {
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<any>();
  const shopify = useAppBridge();
  const { shopSettings } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const hasAutoSubmitted = useRef(false);

  const currentPlan = shopSettings?.plan || "FREE";
  const isSubmitting = navigation.state === "submitting";
  const submittingPlan = isSubmitting && navigation.formData ? (navigation.formData.get("plan") as string) : null;

  useEffect(() => {
    if (actionData?.error) {
      shopify.toast.show(actionData.error, { isError: true });
    } else if (actionData?.success) {
      shopify.toast.show("Plan updated successfully");
    }
  }, [actionData, shopify]);

  const handleUpgrade = (plan: string) => {
    submit({ plan }, { method: "POST" });
  };

  useEffect(() => {
    const plan = searchParams.get("plan");
    if (plan && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      handleUpgrade(plan);
    }
  }, [searchParams]);

  const plans = [
    {
      name: "Free",
      tagline: "Try the full capture flow",
      price: "$0",
      priceHint: "per month",
      scans: "5 scans / month",
      blurb:
        "Run real captures through Auto Entry with a small monthly allowance—ideal for testing AI titles, images, and variants before you commit.",
      features: [
        "AI capture from photos: structured product data for Shopify",
        "Auto SKU suggestions and variant detection",
        "Sync drafts to your catalog for review before publish",
        "5 scans per billing period; upgrade when you need more",
      ],
      action: currentPlan === "FREE" ? "Current" : "Downgrade",
      value: "FREE",
      disabled: currentPlan === "FREE",
    },
    {
      name: "Starter",
      tagline: "Boutiques & small catalogs",
      price: "$19.99",
      priceHint: "per month",
      scans: "100 scans / month",
      blurb:
        "A steady monthly allowance for shops that add new products regularly but don’t need hundreds of scans every week.",
      features: [
        "Everything in Free, with a higher monthly scan cap",
        "100 AI captures per billing period",
        "Priority email support when you need help",
        "Best for single-location stores and lean teams",
      ],
      action: currentPlan === "Starter" ? "Current" : "Upgrade",
      value: "Starter",
      disabled: currentPlan === "Starter",
    },
    {
      name: "Growth",
      tagline: "Scaling product intake",
      price: "$49.99",
      priceHint: "per month",
      scans: "500 scans / month",
      blurb:
        "Built for growing brands onboarding collections, seasonal drops, or multiple suppliers—more headroom without jumping to enterprise tooling.",
      features: [
        "Everything in Starter, with 5× the monthly scans",
        "Voice-friendly flows for hands-free variant notes (where enabled)",
        "Room for higher weekly volume and repeat capture sessions",
        "Still billed as a simple flat subscription in Shopify",
      ],
      action: currentPlan === "Growth" ? "Current" : "Upgrade",
      value: "Growth",
      disabled: currentPlan === "Growth",
      popular: true,
    },
    {
      name: "Power",
      tagline: "High volume & multi-user",
      price: "$99.99",
      priceHint: "per month",
      scans: "1,000 scans / month",
      blurb:
        "Maximum monthly allowance on standard billing—suited to agencies, large catalogs, or teams running batch capture days.",
      features: [
        "Everything in Growth with the highest included scan tier",
        "1,000 AI captures per billing period before top-ups",
        "Workflows that fit team handoffs (capture → review → publish)",
        "Pair with scan top-ups if you ever spike above the cap",
      ],
      action: currentPlan === "Power" ? "Current" : "Upgrade",
      value: "Power",
      disabled: currentPlan === "Power",
    },
  ];

  const topups = [
    {
      scans: "100",
      title: "100 bonus scans",
      tagline: "About $0.10 per scan · quick boost",
      price: "$9.99",
      priceHint: "one-time",
      blurb:
        "Add a hundred extra captures for a short spike—product drops, inventory counts, or photo days—without changing your monthly plan.",
      features: [
        "Stacks on top of your subscription allowance until you use it",
        "Single Shopify charge; no recurring fee",
        "Ideal when you’re mildly over your monthly cap",
        "Works with every subscription tier",
      ],
      value: "TopUp100",
      popular: false,
    },
    {
      scans: "500",
      title: "500 bonus scans",
      tagline: "About $0.08 per scan · best value",
      price: "$39.99",
      priceHint: "one-time",
      blurb:
        "Our most popular pack: serious headroom for seasonal uploads or clearing a backlog without jumping to the next subscription tier.",
      features: [
        "Lower effective rate than smaller packs",
        "Bonus balance stays available until consumed",
        "Checkout stays inside Shopify Billing",
        "Pair with Growth or Power when volume is uneven month to month",
      ],
      value: "TopUp500",
      popular: true,
    },
    {
      scans: "1,000",
      title: "1,000 bonus scans",
      tagline: "About $0.07 per scan · bulk top-up",
      price: "$69.99",
      priceHint: "one-time",
      blurb:
        "Maximum standard top-up for agencies and large catalogs that need a deep reserve before the next renewal cycle.",
      features: [
        "Lowest per-scan rate among fixed packs",
        "One-time purchase; renew your subscription separately as usual",
        "Use across multiple batch sessions until the balance hits zero",
        "Receipt and charge visibility in your Shopify admin",
      ],
      value: "TopUp1000",
      popular: false,
    },
  ];

  const [openPlanId, setOpenPlanId] = useState(currentPlan);
  const [openTopupId, setOpenTopupId] = useState<string | null>(() =>
    topups.find((t) => t.popular)?.value ?? topups[0]?.value ?? null,
  );

  useEffect(() => {
    setOpenPlanId(currentPlan);
  }, [currentPlan]);

  const planCtaLabel = (plan: (typeof plans)[number]) => {
    if (submittingPlan === plan.value) return "Redirecting…";
    if (plan.disabled) return "Current plan";
    if (plan.action === "Downgrade") return "Downgrade";
    return "Upgrade plan";
  };

  const faqs = [
    {
      q: "How does Shopify billing work?",
      a: "Subscriptions are billed through your Shopify account on the same cycle as your store. You approve charges in Shopify; Auto Entry never stores your card.",
    },
    {
      q: "Can I change or cancel my plan?",
      a: "Yes. Upgrade anytime from this page. To move to Free or cancel a paid plan, use the downgrade flow — your subscription is managed like any other Shopify app billing.",
    },
    {
      q: "Do monthly scans roll over?",
      a: "Monthly plan allowances reset each billing period. Unused scans do not roll over. Top-ups add bonus scans on top of your plan when you need extra capacity.",
    },
    {
      q: "Are there hidden fees?",
      a: "No. You pay the listed subscription or one-time top-up price shown here. Shopify may apply taxes per your store settings.",
    },
  ];

  const topupCtaLabel = (topup: (typeof topups)[number]) => {
    if (submittingPlan === topup.value) return "Redirecting…";
    return "Buy top-up";
  };

  return (
    <DashboardPageLayout
      heroAccent="dashboard"
      title="Pricing"
      headerTitle="Pricing"
      subtitle="Monthly plans for AI product capture, plus optional scan top-ups when you need more."
    >
      <div className="support-page pricing-page">
        <div className="pricing-page__split">
          <div className="pricing-page__plans">
            <p className="marketing-unified-capture-label">Subscriptions</p>
            <h3 className="pricing-accordion__heading">Select a plan</h3>
            <div className="pricing-plans-stack pricing-accordion" role="list">
              {plans.map((plan) => {
                const isOpen = openPlanId === plan.value;
                return (
                  <div
                    key={plan.value}
                    role="listitem"
                    className={
                      "pricing-accordion__card" +
                      (isOpen ? " pricing-accordion__card--open" : "") +
                      (plan.popular ? " pricing-accordion__card--popular" : "") +
                      (plan.disabled ? " pricing-accordion__card--current" : "")
                    }
                  >
                    <button
                      type="button"
                      className="pricing-accordion__trigger"
                      aria-expanded={isOpen}
                      aria-controls={`plan-panel-${plan.value}`}
                      id={`plan-trigger-${plan.value}`}
                      onClick={() =>
                        setOpenPlanId((prev) => (prev === plan.value ? null : plan.value))
                      }
                    >
                      <span
                        className={
                          "pricing-accordion__radio" +
                          (isOpen ? " pricing-accordion__radio--on" : "")
                        }
                        aria-hidden
                      />
                      <span className="pricing-accordion__trigger-main">
                        <span className="pricing-accordion__title-row">
                          <span className="pricing-accordion__name">{plan.name}</span>
                          {plan.popular ? (
                            <span className="pricing-accordion__pill">Popular</span>
                          ) : null}
                        </span>
                        <span className="pricing-accordion__tagline">{plan.tagline}</span>
                      </span>
                      <span className="pricing-accordion__trigger-price">
                        <span className="pricing-accordion__price">{plan.price}</span>
                        <span className="pricing-accordion__unit">{plan.priceHint}</span>
                      </span>
                    </button>
                    {isOpen ? (
                      <div
                        className="pricing-accordion__panel"
                        id={`plan-panel-${plan.value}`}
                        role="region"
                        aria-labelledby={`plan-trigger-${plan.value}`}
                      >
                        <p className="pricing-accordion__blurb">{plan.blurb}</p>
                        <p className="pricing-accordion__allowance">{plan.scans}</p>
                        <h4 className="pricing-accordion__includes-label">What&apos;s included</h4>
                        <ul
                          className="pricing-accordion__features"
                          aria-label={`${plan.name} features`}
                        >
                          {plan.features.map((f) => (
                            <li key={f} className="pricing-accordion__feature">
                              <span className="pricing-accordion__check" aria-hidden />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="pricing-accordion__divider" role="presentation" />
                        <div className="pricing-accordion__cta-row">
                          <button
                            type="button"
                            className={
                              "pricing-accordion__cta" +
                              (plan.disabled ? " pricing-accordion__cta--muted" : "") +
                              (plan.popular && !plan.disabled ? " pricing-accordion__cta--accent" : "")
                            }
                            onClick={() => handleUpgrade(plan.value)}
                            disabled={
                              plan.disabled || (isSubmitting && submittingPlan !== plan.value)
                            }
                          >
                            {planCtaLabel(plan)}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pricing-page__topups">
            <p className="marketing-unified-capture-label">Add-ons</p>
            <h3 className="pricing-accordion__heading">Scan top-ups</h3>
            <p className="pricing-page__topups-lede">
              One-time packs when you go over your monthly allowance — same checkout as subscriptions.
            </p>
            <div className="pricing-plans-stack pricing-accordion" role="list">
              {topups.map((topup) => {
                const isOpen = openTopupId === topup.value;
                return (
                  <div
                    key={topup.value}
                    role="listitem"
                    className={
                      "pricing-accordion__card" +
                      (isOpen ? " pricing-accordion__card--open" : "") +
                      (topup.popular ? " pricing-accordion__card--popular" : "")
                    }
                  >
                    <button
                      type="button"
                      className="pricing-accordion__trigger"
                      aria-expanded={isOpen}
                      aria-controls={`topup-panel-${topup.value}`}
                      id={`topup-trigger-${topup.value}`}
                      onClick={() =>
                        setOpenTopupId((prev) => (prev === topup.value ? null : topup.value))
                      }
                    >
                      <span
                        className={
                          "pricing-accordion__radio" +
                          (isOpen ? " pricing-accordion__radio--on" : "")
                        }
                        aria-hidden
                      />
                      <span className="pricing-accordion__trigger-main">
                        <span className="pricing-accordion__title-row">
                          <span className="pricing-accordion__name">{topup.title}</span>
                          {topup.popular ? (
                            <span className="pricing-accordion__pill">Best value</span>
                          ) : null}
                        </span>
                        <span className="pricing-accordion__tagline">{topup.tagline}</span>
                      </span>
                      <span className="pricing-accordion__trigger-price">
                        <span className="pricing-accordion__price">{topup.price}</span>
                        <span className="pricing-accordion__unit">{topup.priceHint}</span>
                      </span>
                    </button>
                    {isOpen ? (
                      <div
                        className="pricing-accordion__panel"
                        id={`topup-panel-${topup.value}`}
                        role="region"
                        aria-labelledby={`topup-trigger-${topup.value}`}
                      >
                        <p className="pricing-accordion__blurb">{topup.blurb}</p>
                        <p className="pricing-accordion__allowance">{topup.scans} bonus scans</p>
                        <h4 className="pricing-accordion__includes-label">What you get</h4>
                        <ul
                          className="pricing-accordion__features"
                          aria-label={`${topup.title} details`}
                        >
                          {topup.features.map((f) => (
                            <li key={f} className="pricing-accordion__feature">
                              <span className="pricing-accordion__check" aria-hidden />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="pricing-accordion__divider" role="presentation" />
                        <div className="pricing-accordion__cta-row">
                          <button
                            type="button"
                            className={
                              "pricing-accordion__cta" +
                              (topup.popular ? " pricing-accordion__cta--accent" : "")
                            }
                            onClick={() => handleUpgrade(topup.value)}
                            disabled={isSubmitting && submittingPlan !== topup.value}
                          >
                            {topupCtaLabel(topup)}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <section
          className="pricing-page__faq-full"
          aria-labelledby="pricing-faq-heading"
        >
          <p className="marketing-unified-capture-label">Help</p>
          <h2 id="pricing-faq-heading" className="pricing-page__faq-full-title">
            Common questions
          </h2>
          <div className="pricing-faq pricing-faq--full" role="region" aria-label="Pricing questions">
            {faqs.map((item) => (
              <details key={item.q} className="pricing-faq__item">
                <summary className="pricing-faq__summary">{item.q}</summary>
                <p className="pricing-faq__answer">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </DashboardPageLayout>
  );
}
