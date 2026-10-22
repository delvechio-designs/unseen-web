import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { signupSchema, PLATFORM_LABELS, TERMS_VERSION } from "@/lib/signup-schema";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSubscriptionCheckout } from "@/lib/stripe";
import { sendAdminNewSignup, sendVerificationInstructions } from "@/lib/email";
import { hostOf } from "@/lib/dmca";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I
function verificationCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_CHARS[randomInt(CODE_CHARS.length)];
  return `UNSEEN-${s}`;
}

export async function POST(req: Request) {
  const parsed = signupSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const input = parsed.data;
  if (input.company_url) return NextResponse.json({ ok: true, checkoutUrl: "/start/thanks" });

  const db = supabaseAdmin();

  const { data: creator, error } = await db
    .from("creators")
    .insert({
      display_name: input.displayName,
      legal_name: input.legalName,
      email: input.email.toLowerCase(),
      status: "pending_verification",
      plan: input.plan,
      subscription_status: "incomplete",
    })
    .select("id")
    .single();

  if (error || !creator) {
    console.error("creator insert failed", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
  const creatorId = creator.id as string;

  const accounts = input.accounts.map((a) => ({
    creator_id: creatorId,
    platform: a.platform,
    handle: a.handle.replace(/^@/, ""),
    profile_url: a.profileUrl,
    verification_code: verificationCode(),
  }));

  const aliases = [...new Set(input.aliases.filter((a) => a.toLowerCase() !== input.displayName.toLowerCase()))];
  const leaks = [...new Set(input.knownLeaks)].map((url) => ({
    creator_id: creatorId,
    url,
    domain: hostOf(url),
    source: "creator_report" as const,
  }));

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const results = await Promise.all([
    db.from("platform_accounts").insert(accounts),
    aliases.length
      ? db.from("creator_aliases").insert(aliases.map((alias) => ({ creator_id: creatorId, alias })))
      : Promise.resolve({ error: null }),
    leaks.length ? db.from("leaks").insert(leaks) : Promise.resolve({ error: null }),
    db.from("authorizations").insert({
      creator_id: creatorId,
      signed_name: input.legalName,
      ip_address: ip,
      user_agent: req.headers.get("user-agent")?.slice(0, 400) ?? null,
      terms_version: TERMS_VERSION,
      attest_rights: input.attestRights,
      attest_adults_consent: input.attestConsent,
    }),
    db.from("events").insert({
      creator_id: creatorId,
      type: "signup.submitted",
      payload: { plan: input.plan, accounts: accounts.length, known_leaks: leaks.length },
    }),
  ]);

  const failed = results.find((r) => r.error);
  if (failed) {
    console.error("signup child insert failed", failed.error);
    await db.from("creators").delete().eq("id", creatorId); // cascade cleans up
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  let checkoutUrl: string;
  try {
    const session = await createSubscriptionCheckout({ creatorId, email: input.email, plan: input.plan });
    checkoutUrl = session.url!;
  } catch (e) {
    console.error("stripe checkout failed", e);
    return NextResponse.json({ error: "Payment setup is unavailable right now." }, { status: 502 });
  }

  await Promise.allSettled([
    sendVerificationInstructions({
      to: input.email,
      displayName: input.displayName,
      accounts: accounts.map((a) => ({
        platformLabel: PLATFORM_LABELS[a.platform],
        handle: a.handle,
        code: a.verification_code,
      })),
    }),
    sendAdminNewSignup({
      displayName: input.displayName,
      email: input.email,
      plan: input.plan,
      accounts: accounts.length,
      knownLeaks: leaks.length,
      creatorId,
    }),
  ]).then((s) => s.forEach((r) => r.status === "rejected" && console.error("email failed", r.reason)));

  return NextResponse.json({ ok: true, checkoutUrl });
}
