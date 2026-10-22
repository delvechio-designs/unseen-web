import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { activateIfReady } from "@/lib/activation";
import { sendMonthlyReport } from "@/lib/email";
import { hostOf } from "@/lib/dmca";

// Shared operations used by both the admin dashboard and the admin API routes.

export async function setVerification(platformAccountId: string, failed: boolean) {
  const db = supabaseAdmin();
  const { data: account, error } = await db
    .from("platform_accounts")
    .update({
      verification_status: failed ? "failed" : "verified",
      verified_at: failed ? null : new Date().toISOString(),
    })
    .eq("id", platformAccountId)
    .select("id, creator_id, platform, handle")
    .single();
  if (error || !account) return null;

  await db.from("events").insert({
    creator_id: account.creator_id,
    type: failed ? "account.verification_failed" : "account.verified",
    payload: { platform_account_id: account.id, platform: account.platform, handle: account.handle },
  });

  const creatorActive = failed ? false : await activateIfReady(account.creator_id);
  return { account, creatorActive };
}

export async function sendReport(creatorId: string) {
  const db = supabaseAdmin();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: creator } = await db.from("creators").select("email, display_name").eq("id", creatorId).single();
  if (!creator) return null;

  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [found, sent, removed, pending] = await Promise.all([
    count(db.from("leaks").select("id", { count: "exact", head: true }).eq("creator_id", creatorId).gte("found_at", since).neq("status", "ignored")),
    count(db.from("takedown_notices").select("id", { count: "exact", head: true }).eq("creator_id", creatorId).gte("sent_at", since)),
    count(db.from("leaks").select("id", { count: "exact", head: true }).eq("creator_id", creatorId).gte("removed_at", since)),
    count(db.from("leaks").select("id", { count: "exact", head: true }).eq("creator_id", creatorId).in("status", ["found", "notice_sent", "reappeared"])),
  ]);

  await sendMonthlyReport({ to: creator.email, displayName: creator.display_name, found, sent, removed, pending });
  await db.from("events").insert({ creator_id: creatorId, type: "report.sent", payload: { found, sent, removed, pending } });
  return { found, sent, removed, pending };
}

// Adds leak URLs for a creator. Skips duplicates and domains marked "ignore".
export async function addLeaks(
  creatorId: string,
  urls: string[],
  source: "creator_report" | "manual_search" | "monitor",
  notes?: string
): Promise<number> {
  const db = supabaseAdmin();
  const clean = [...new Set(urls.map((u) => u.trim()).filter((u) => /^https?:\/\/\S+\.\S+/i.test(u)))].slice(0, 100);
  if (!clean.length) return 0;

  const domains = [...new Set(clean.map(hostOf))];
  const { data: ignored } = await db.from("domain_rules").select("domain").eq("rule", "ignore").in("domain", domains);
  const skip = new Set((ignored ?? []).map((r) => r.domain));

  const rows = clean
    .filter((u) => !skip.has(hostOf(u)))
    .map((url) => ({ creator_id: creatorId, url, domain: hostOf(url), source, notes: notes ?? null }));
  if (!rows.length) return 0;

  const { data, error } = await db
    .from("leaks")
    .upsert(rows, { onConflict: "creator_id,url", ignoreDuplicates: true })
    .select("id");
  if (error) {
    console.error("addLeaks failed", error);
    return 0;
  }
  const added = data?.length ?? 0;
  if (added) {
    await db.from("events").insert({ creator_id: creatorId, type: "leaks.added", payload: { source, count: added } });
  }
  return added;
}
