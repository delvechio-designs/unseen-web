import { NextResponse } from "next/server";
import { isCron } from "@/lib/cron-auth";
import { searchEnabled } from "@/lib/monitor/search";
import { dueCreators, sweepCreator, recheckRemoved } from "@/lib/monitor/sweep";

// Daily (see vercel.json). Sweeps creators that are due (Pro daily, Starter weekly),
// then rechecks removed links for reappearance.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const started = Date.now();
  const results: { creatorId: string; added: number; candidates: number; errors: number }[] = [];

  if (searchEnabled()) {
    for (const c of await dueCreators(25)) {
      if (Date.now() - started > 40_000) break; // leave room for rechecks; the rest run next time
      const r = await sweepCreator(c);
      results.push({ creatorId: c.id, ...r });
    }
  }

  const recheck = await recheckRemoved(Date.now() - started > 45_000 ? 0 : 40);

  return NextResponse.json({
    ok: true,
    searchEnabled: searchEnabled(),
    swept: results.length,
    added: results.reduce((a, r) => a + r.added, 0),
    recheck,
  });
}
