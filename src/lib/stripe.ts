import "server-only";
import Stripe from "stripe";
import { requireEnv, siteUrl } from "@/lib/env";

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;
  cached = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  return cached;
}

export type Plan = "starter" | "pro";

export function priceIdFor(plan: Plan): string {
  return plan === "pro" ? requireEnv("STRIPE_PRICE_PRO") : requireEnv("STRIPE_PRICE_STARTER");
}

export function planForPrice(priceId: string | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  return null;
}

// Monthly subscription checkout. The creator id travels in metadata so the webhook can link it.
export async function createSubscriptionCheckout(opts: {
  creatorId: string;
  email: string;
  plan: Plan;
}) {
  return stripe().checkout.sessions.create({
    mode: "subscription",
    customer_email: opts.email,
    client_reference_id: opts.creatorId,
    line_items: [{ price: priceIdFor(opts.plan), quantity: 1 }],
    subscription_data: { metadata: { creator_id: opts.creatorId } },
    metadata: { creator_id: opts.creatorId },
    success_url: `${siteUrl()}/start/thanks?c=${opts.creatorId}`,
    cancel_url: `${siteUrl()}/start?cancelled=1`,
    allow_promotion_codes: true,
  });
}
