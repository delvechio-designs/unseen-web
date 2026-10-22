import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin-auth";
import { sendReport } from "@/lib/operations";

// POST /api/admin/report  { "creatorId": "<uuid>" }
// Emails the creator a 30-day summary: leaks found, notices sent, removed, still pending.

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = z.object({ creatorId: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "creatorId required" }, { status: 400 });

  const result = await sendReport(parsed.data.creatorId);
  if (!result) return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  return NextResponse.json({ ok: true, ...result });
}
