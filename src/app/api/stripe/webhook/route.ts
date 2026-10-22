import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, planForPrice } from "@/lib/stripe";
import { requireEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { activateIfReady } from "@/lib/activation";

// Stripe webhook endpoint: /api/stripe/webhook
// Events: checkout.session.completed, customer.subscription.updated,
//         customer.subscription.deleted, invoice.payment_failed

function mapStatus(s: Stripe.Subscription.Status): "incomplete" | "active" | "past_due" | "canceled" {
  if (s === "active" || s === "trialing") return "active";
  if (s === "past_due" || s === "unpaid") return "past_due";
  if (s === "canceled" || s === "incomplete_expired") return "canceled";
  return "incomplete";
}

async function syncSubscription(sub: Stripe.Subscription) {
  const db = supabaseAdmin();
  const creatorId = sub.metadata?.creator_id;
  const status = mapStatus(sub.status);
  const plan = planForPrice(sub.items.data[0]?.price.id);
  const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;

  const update: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    subscription_status: status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  };
  if (plan) update.plan = plan;
  if (status === "canceled") update.status = "cancelled";
  if (status === "past_due") update.status = "paused";

  const q = db.from("creators").update(update);
  const { data } = await (creatorId ? q.eq("id", creatorId) : q.eq("stripe_subscription_id", sub.id))
    .select("id")
    .maybeSingle();

  if (data?.id && status === "active") await activateIfReady(data.id);
  return data?.id ?? null;
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "No signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, requireEnv("STRIPE_WEBHOOK_SECRET"));
  } catch (err) {
    console.error("stripe signature check failed", err);
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  let creatorId: string | null = null;

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const sub = await stripe().subscriptions.retrieve(subId);
        if (!sub.metadata?.creator_id && session.client_reference_id) {
          sub.metadata = { ...sub.metadata, creator_id: session.client_reference_id };
        }
        creatorId = await syncSubscription(sub);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      creatorId = await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const { data } = await supabaseAdmin()
        .from("creators")
        .select("id")
        .eq("stripe_customer_id", String(invoice.customer))
        .maybeSingle();
      creatorId = data?.id ?? null;
      break;
    }
  }

  await supabaseAdmin().from("events").insert({
    creator_id: creatorId,
    type: `stripe.${event.type}`,
    payload: { stripe_event_id: event.id },
  });

  return NextResponse.json({ received: true });
}
