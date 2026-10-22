import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { addLeaks } from "@/lib/operations";
import { searchWeb } from "./search";
import { hostOf } from "@/lib/dmca";

// Automated sweeps. Results are CANDIDATES: they land as leaks with source "monitor" and stay hidden
// from the creator until an admin reviews them and sends a notice (good-faith check stays human).

const SWEEP_INTERVAL_HOURS = { pro: 20, starter: 24 * 6.5 } as const; // daily vs weekly, with slack for cron timing
const QUERY_TEMPLATES = ['"{name}" leaked', '"{name}" leak', '"{name}" onlyfans free', '"{name}" mega'];
const MAX_QUERIES_PER_CREATOR = 8;

// Results whose title or URL doesn't mention the name are dropped as noise.
function mentionsName(hit: { url: string; title: string }, names: string[]) {
  const hay = `${hit.title} ${decodeURIComponent(hit.url)}`.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  return names.some((n) => {
    const needle = n.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return needle.length >= 3 && hay.includes(needle);
  });
}

export async function dueCreators(limit: number) {
  const db = supabaseAdmin();
  const now = Date.now();
  const { data } = await db
    .from("creators")
    .select("id, display_name, plan, last_sweep_at")
    .eq("status", "active")
    .order("last_sweep_at", { ascending: true, nullsFirst: true })
    .limit(500);

  return (data ?? [])
    .filter((c) => {
      if (!c.last_sweep_at) return true;
      const hours = (now - new Date(c.last_sweep_at).getTime()) / 3_600_000;
      return hours >= SWEEP_INTERVAL_HOURS[c.plan as "pro" | "starter"];
    })
    .slice(0, limit);
}

export async function sweepCreator(creator: { id: string; display_name: string }) {
  const db = supabaseAdmin();
  const [{ data: aliases }, { data: accounts }] = await Promise.all([
    db.from("creator_aliases").select("alias").eq("creator_id", creator.id),
    db.from("platform_accounts").select("profile_url, handle").eq("creator_id", creator.id),
  ]);

  const names = [creator.display_name, ...(aliases ?? []).map((a) => a.alias)];
  const queries = names.flatMap((name) => QUERY_TEMPLATES.map((t) => t.replace("{name}", name))).slice(0, MAX_QUERIES_PER_CREATOR);
  const ownHosts = new Set((accounts ?? []).map((a) => hostOf(a.profile_url)));

  const found = new Set<string>();
  let errors = 0;
  for (const q of queries) {
    try {
      const hits = await searchWeb(q);
      for (const h of hits) {
        if (ownHosts.has(hostOf(h.url))) continue;
        if (!mentionsName(h, [...names, ...(accounts ?? []).map((a) => a.handle)])) continue;
        found.add(h.url);
      }
    } catch (e) {
      errors++;
      console.error("sweep query failed", q, e);
      if (String(e).includes("rate limit")) break;
    }
  }

  const added = await addLeaks(creator.id, [...found], "monitor", "Monitor candidate: review before sending");
  await db.from("creators").update({ last_sweep_at: new Date().toISOString() }).eq("id", creator.id);
  await db.from("events").insert({
    creator_id: creator.id,
    type: "monitor.sweep",
    payload: { queries: queries.length, candidates: found.size, added, errors },
  });
  return { candidates: found.size, added, errors };
}

// Rechecks removed leaks. HEAD request only: reads the status code, never the content.
export async function recheckRemoved(limit: number) {
  const db = supabaseAdmin();
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: leaks } = await db
    .from("leaks")
    .select("id, url, creator_id, last_checked_at")
    .eq("status", "removed")
    .or(`last_checked_at.is.null,last_checked_at.lt.${cutoff}`)
    .limit(limit);

  let back = 0;
  for (const l of leaks ?? []) {
    let live = false;
    try {
      const res = await fetch(l.url, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(8_000), cache: "no-store" });
      live = res.status === 200;
    } catch {
      live = false;
    }
    const update: Record<string, unknown> = { last_checked_at: new Date().toISOString() };
    if (live) {
      update.status = "reappeared";
      update.notes = "Recheck: URL answering again. Confirm content is back before re-sending.";
      back++;
    }
    await db.from("leaks").update(update).eq("id", l.id);
    if (live) await db.from("events").insert({ creator_id: l.creator_id, type: "monitor.reappeared", payload: { leak_id: l.id } });
  }
  return { checked: leaks?.length ?? 0, back };
}
