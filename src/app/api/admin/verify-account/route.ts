import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { activateIfReady } from "@/lib/activation";

// POST /api/admin/verify-account  { "platformAccountId": "<uuid>", "failed"?: true }
// Call after you have personally seen the verification code in the account's bio.

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = z
    .object({ platformAccountId: z.string().uuid(), failed: z.boolean().optional() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "platformAccountId required" }, { status: 400 });

  const db = supabaseAdmin();
  const failed = parsed.data.failed === true;

  const { data: account, error } = await db
    .from("platform_accounts")
    .update({
      verification_status: failed ? "failed" : "verified",
      verified_at: failed ? null : new Date().toISOString(),
    })
    .eq("id", parsed.data.platformAccountId)
    .select("id, creator_id, platform, handle")
    .single();

  if (error || !account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  await db.from("events").insert({
    creator_id: account.creator_id,
    type: failed ? "account.verification_failed" : "account.verified",
    payload: { platform_account_id: account.id, platform: account.platform, handle: account.handle },
  });

  const active = failed ? false : await activateIfReady(account.creator_id);
  return NextResponse.json({ ok: true, creatorActive: active });
}
