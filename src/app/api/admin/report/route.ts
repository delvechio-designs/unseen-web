import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendMonthlyReport } from "@/lib/email";

// POST /api/admin/report  { "creatorId": "<uuid>" }
// Emails the creator a 30-day summary: leaks found, notices sent, removed, still pending.

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = z.object({ creatorId: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "creatorId required" }, { status: 400 });

  const db = supabaseAdmin();
  const id = parsed.data.creatorId;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: creator } = await db.from("creators").select("email, display_name").eq("id", id).single();
  if (!creator) return NextResponse.json({ error: "Creator not found" }, { status: 404 });

  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

  const [found, sent, removed, pending] = await Promise.all([
    count(db.from("leaks").select("id", { count: "exact", head: true }).eq("creator_id", id).gte("found_at", since)),
    count(db.from("takedown_notices").select("id", { count: "exact", head: true }).eq("creator_id", id).gte("sent_at", since)),
    count(db.from("leaks").select("id", { count: "exact", head: true }).eq("creator_id", id).gte("removed_at", since)),
    count(db.from("leaks").select("id", { count: "exact", head: true }).eq("creator_id", id).in("status", ["found", "notice_sent", "reappeared"])),
  ]);

  await sendMonthlyReport({ to: creator.email, displayName: creator.display_name, found, sent, removed, pending });
  await db.from("events").insert({ creator_id: id, type: "report.sent", payload: { found, sent, removed, pending } });

  return NextResponse.json({ ok: true, found, sent, removed, pending });
}
