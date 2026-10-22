"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { setVerification, sendReport, addLeaks } from "@/lib/operations";
import { createNotice, setNoticeStatus, noticeInputSchema, NOTICE_STATUSES } from "@/lib/notices";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function verifyAccountAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "accountId");
  const failed = str(formData, "result") === "failed";
  await setVerification(id, failed);
  revalidatePath("/admin", "layout");
}

export async function sendReportAction(formData: FormData) {
  await requireAdmin();
  const creatorId = str(formData, "creatorId");
  await sendReport(creatorId);
  redirect(`/admin/creators/${creatorId}?flash=report_sent`);
}

export async function addLeaksAction(formData: FormData) {
  await requireAdmin();
  const creatorId = str(formData, "creatorId");
  const urls = str(formData, "urls").split(/\s+/);
  const added = await addLeaks(creatorId, urls, "manual_search");
  redirect(`/admin/creators/${creatorId}?flash=leaks_${added}`);
}

export async function setLeakStatusAction(formData: FormData) {
  await requireAdmin();
  const leakId = str(formData, "leakId");
  const status = str(formData, "status");
  if (!["found", "ignored", "removed", "reappeared"].includes(status)) return;
  const update: Record<string, unknown> = { status, last_checked_at: new Date().toISOString() };
  if (status === "removed") update.removed_at = new Date().toISOString();
  const { data } = await supabaseAdmin().from("leaks").update(update).eq("id", leakId).select("creator_id").single();
  if (data) {
    await supabaseAdmin().from("events").insert({ creator_id: data.creator_id, type: `leak.${status}`, payload: { leak_id: leakId } });
  }
  revalidatePath("/admin", "layout");
}

export async function createNoticeAction(formData: FormData) {
  await requireAdmin();
  const leakId = str(formData, "leakId");
  const parsed = noticeInputSchema.safeParse({
    leakId,
    recipientType: str(formData, "recipientType"),
    recipientName: str(formData, "recipientName"),
    recipientContact: str(formData, "recipientContact") || undefined,
    method: str(formData, "method"),
    send: formData.get("send") === "on",
    saveContact: formData.get("saveContact") === "on",
  });
  if (!parsed.success) redirect(`/admin/leaks/${leakId}?error=${encodeURIComponent("Check the recipient fields")}`);

  const result = await createNotice(parsed.data);
  if (!result.ok) {
    const q = new URLSearchParams({ error: result.error });
    if (result.noticeId) q.set("notice", result.noticeId);
    redirect(`/admin/leaks/${leakId}?${q}`);
  }
  redirect(`/admin/leaks/${leakId}?notice=${result.noticeId}${result.sent ? "&flash=sent" : ""}`);
}

export async function setNoticeStatusAction(formData: FormData) {
  await requireAdmin();
  const noticeId = str(formData, "noticeId");
  const status = str(formData, "status") as (typeof NOTICE_STATUSES)[number];
  if (!NOTICE_STATUSES.includes(status)) return;
  await setNoticeStatus(noticeId, status, str(formData, "externalRef") || undefined);
  revalidatePath("/admin", "layout");
}

export async function addAliasAction(formData: FormData) {
  await requireAdmin();
  const creatorId = str(formData, "creatorId");
  const alias = str(formData, "alias").slice(0, 80);
  if (alias) await supabaseAdmin().from("creator_aliases").upsert({ creator_id: creatorId, alias }, { onConflict: "creator_id,alias", ignoreDuplicates: true });
  revalidatePath(`/admin/creators/${creatorId}`);
}

export async function removeAliasAction(formData: FormData) {
  await requireAdmin();
  await supabaseAdmin().from("creator_aliases").delete().eq("id", str(formData, "aliasId"));
  revalidatePath(`/admin/creators/${str(formData, "creatorId")}`);
}

export async function setCreatorStatusAction(formData: FormData) {
  await requireAdmin();
  const creatorId = str(formData, "creatorId");
  const status = str(formData, "status");
  if (!["active", "paused"].includes(status)) return;
  await supabaseAdmin().from("creators").update({ status }).eq("id", creatorId);
  await supabaseAdmin().from("events").insert({ creator_id: creatorId, type: `creator.${status}`, payload: { by: "admin" } });
  revalidatePath(`/admin/creators/${creatorId}`);
}

export async function saveNotesAction(formData: FormData) {
  await requireAdmin();
  const creatorId = str(formData, "creatorId");
  await supabaseAdmin().from("creators").update({ notes: str(formData, "notes").slice(0, 4000) || null }).eq("id", creatorId);
  revalidatePath(`/admin/creators/${creatorId}`);
}

export async function saveDomainRuleAction(formData: FormData) {
  await requireAdmin();
  const domain = str(formData, "domain").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  if (!domain || !domain.includes(".")) redirect("/admin/hosts?error=domain");
  await supabaseAdmin()
    .from("domain_rules")
    .upsert(
      {
        domain,
        rule: str(formData, "rule") === "ignore" ? "ignore" : "leak_site",
        recipient_type: str(formData, "recipientType") || null,
        recipient_name: str(formData, "recipientName") || null,
        abuse_contact: str(formData, "abuseContact") || null,
        contact_method: str(formData, "contactMethod") || null,
        notes: str(formData, "notes") || null,
      },
      { onConflict: "domain" }
    );
  revalidatePath("/admin/hosts");
}

export async function deleteDomainRuleAction(formData: FormData) {
  await requireAdmin();
  await supabaseAdmin().from("domain_rules").delete().eq("domain", str(formData, "domain"));
  revalidatePath("/admin/hosts");
}
