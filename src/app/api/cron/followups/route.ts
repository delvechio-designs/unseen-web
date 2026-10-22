import { NextResponse } from "next/server";
import { isCron } from "@/lib/cron-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendAdminDigest } from "@/lib/email";

// Daily (see vercel.json). Emails the admin a digest of what needs attention.

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

  const [toVerify, needNotice, monitorNew, stale, reappeared] = await Promise.all([
    count(db.from("platform_accounts").select("id", { count: "exact", head: true }).eq("verification_status", "pending")),
    count(db.from("leaks").select("id", { count: "exact", head: true }).eq("status", "found").neq("source", "monitor")),
    count(db.from("leaks").select("id", { count: "exact", head: true }).eq("status", "found").eq("source", "monitor")),
    count(db.from("takedown_notices").select("id", { count: "exact", head: true }).in("status", ["sent", "acknowledged"]).lt("sent_at", weekAgo)),
    count(db.from("leaks").select("id", { count: "exact", head: true }).eq("status", "reappeared")),
  ]);

  const total = toVerify + needNotice + monitorNew + stale + reappeared;
  if (total > 0) {
    await sendAdminDigest({ toVerify, needNotice, monitorNew, stale, reappeared });
  }
  return NextResponse.json({ ok: true, emailed: total > 0, toVerify, needNotice, monitorNew, stale, reappeared });
}
