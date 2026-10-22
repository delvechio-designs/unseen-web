"use server";

import { redirect } from "next/navigation";
import { requireCreator } from "@/lib/auth";
import { addLeaks } from "@/lib/operations";
import { stripe } from "@/lib/stripe";
import { siteUrl } from "@/lib/env";

export async function reportLeaksAction(formData: FormData) {
  const creator = await requireCreator();
  if (!creator) redirect("/portal");
  const urls = String(formData.get("urls") ?? "").split(/\s+/).slice(0, 50);
  const added = await addLeaks(creator.id, urls, "creator_report");
  redirect(`/portal?reported=${added}`);
}

export async function billingPortalAction() {
  const creator = await requireCreator();
  if (!creator?.stripe_customer_id) redirect("/portal/account?error=billing");
  const session = await stripe().billingPortal.sessions.create({
    customer: creator.stripe_customer_id,
    return_url: `${siteUrl()}/portal/account`,
  });
  redirect(session.url);
}
