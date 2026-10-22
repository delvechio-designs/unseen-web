import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendWelcome } from "@/lib/email";

// A creator becomes active only when ALL of these are true:
// at least one verified platform account, a signed authorization, and an active subscription.
export async function activateIfReady(creatorId: string): Promise<boolean> {
  const db = supabaseAdmin();
  const [{ data: creator }, { count: verified }, { count: auths }] = await Promise.all([
    db.from("creators").select("id, email, display_name, status, subscription_status").eq("id", creatorId).single(),
    db
      .from("platform_accounts")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creatorId)
      .eq("verification_status", "verified"),
    db.from("authorizations").select("id", { count: "exact", head: true }).eq("creator_id", creatorId),
  ]);

  if (!creator) return false;
  const ready = creator.subscription_status === "active" && (verified ?? 0) > 0 && (auths ?? 0) > 0;
  if (!ready || creator.status === "active") return creator.status === "active";

  await db.from("creators").update({ status: "active" }).eq("id", creatorId);
  await db.from("events").insert({ creator_id: creatorId, type: "creator.activated", payload: {} });
  await sendWelcome(creator.email, creator.display_name).catch((e) => console.error("welcome email failed", e));
  return true;
}

// Notices may only go out for creators who passed every check.
export async function canSendNotices(creatorId: string): Promise<{ ok: boolean; reason?: string }> {
  const db = supabaseAdmin();
  const [{ data: creator }, { count: verified }, { count: auths }] = await Promise.all([
    db.from("creators").select("status").eq("id", creatorId).single(),
    db
      .from("platform_accounts")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creatorId)
      .eq("verification_status", "verified"),
    db.from("authorizations").select("id", { count: "exact", head: true }).eq("creator_id", creatorId),
  ]);
  if (!creator) return { ok: false, reason: "Creator not found" };
  if (creator.status !== "active") return { ok: false, reason: `Creator status is ${creator.status}` };
  if (!verified) return { ok: false, reason: "No verified platform account" };
  if (!auths) return { ok: false, reason: "No signed authorization" };
  return { ok: true };
}
