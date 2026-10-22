import "server-only";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { canSendNotices } from "@/lib/activation";
import { buildNotice, hostOf } from "@/lib/dmca";
import { sendNotice } from "@/lib/email";

export const RECIPIENT_TYPES = ["host", "registrar", "cdn", "search_engine", "platform", "other"] as const;
export const NOTICE_METHODS = ["email", "web_form", "other"] as const;
export const NOTICE_STATUSES = ["draft", "sent", "acknowledged", "removed", "rejected", "no_response"] as const;

export const noticeInputSchema = z.object({
  leakId: z.string().uuid(),
  recipientType: z.enum(RECIPIENT_TYPES),
  recipientName: z.string().trim().min(2).max(160),
  recipientContact: z.string().trim().max(300).optional(),
  method: z.enum(NOTICE_METHODS),
  send: z.boolean().optional(),
  saveContact: z.boolean().optional(),
});
export type NoticeInput = z.infer<typeof noticeInputSchema>;

export type NoticeResult =
  | { ok: true; noticeId: string; sent: boolean; subject: string; body: string }
  | { ok: false; status: number; error: string; noticeId?: string; subject?: string; body?: string };

// Creates a notice for a leak, after the verification gate. Optionally emails it and remembers the contact.
export async function createNotice(input: NoticeInput): Promise<NoticeResult> {
  const db = supabaseAdmin();

  const { data: leak } = await db
    .from("leaks")
    .select("id, url, domain, creator_id, creators(display_name)")
    .eq("id", input.leakId)
    .single();
  if (!leak) return { ok: false, status: 404, error: "Leak not found" };

  const gate = await canSendNotices(leak.creator_id);
  if (!gate.ok) return { ok: false, status: 409, error: `Cannot send: ${gate.reason}` };

  const { data: verifiedAccounts } = await db
    .from("platform_accounts")
    .select("profile_url")
    .eq("creator_id", leak.creator_id)
    .eq("verification_status", "verified");

  const stageName = (leak.creators as unknown as { display_name: string }).display_name;
  const { subject, body } = buildNotice({
    stageName,
    originalUrls: (verifiedAccounts ?? []).map((a) => a.profile_url),
    infringingUrl: leak.url,
    recipientName: input.recipientName,
  });

  const { data: notice, error } = await db
    .from("takedown_notices")
    .insert({
      leak_id: leak.id,
      creator_id: leak.creator_id,
      recipient_type: input.recipientType,
      recipient_name: input.recipientName,
      recipient_contact: input.recipientContact || null,
      method: input.method,
      status: "draft",
      body,
    })
    .select("id")
    .single();

  if (error || !notice) {
    console.error("notice insert failed", error);
    return { ok: false, status: 500, error: "Could not save notice" };
  }

  if (input.saveContact && input.recipientContact) {
    await db.from("domain_rules").upsert(
      {
        domain: leak.domain || hostOf(leak.url),
        rule: "leak_site",
        recipient_type: input.recipientType,
        recipient_name: input.recipientName,
        abuse_contact: input.recipientContact,
        contact_method: input.method,
      },
      { onConflict: "domain" }
    );
  }

  let sent = false;
  if (input.send && input.method === "email") {
    const to = input.recipientContact ?? "";
    if (!z.string().email().safeParse(to).success) {
      return { ok: false, status: 400, error: "Contact must be an email address to send", noticeId: notice.id, subject, body };
    }
    try {
      const result = await sendNotice({ to, subject, body });
      await db.from("takedown_notices").update({ status: "sent", external_ref: result.MessageID }).eq("id", notice.id);
      sent = true;
    } catch (e) {
      console.error("notice send failed", e);
      return { ok: false, status: 502, error: "Saved as draft, but sending failed", noticeId: notice.id, subject, body };
    }
  }

  await db.from("events").insert({
    creator_id: leak.creator_id,
    type: sent ? "notice.sent" : "notice.drafted",
    payload: { notice_id: notice.id, leak_id: leak.id, recipient: input.recipientName, method: input.method },
  });

  return { ok: true, noticeId: notice.id, sent, subject, body };
}

export async function setNoticeStatus(noticeId: string, status: (typeof NOTICE_STATUSES)[number], externalRef?: string) {
  const db = supabaseAdmin();
  const update: Record<string, unknown> = { status };
  if (externalRef) update.external_ref = externalRef;
  if (status === "rejected" || status === "no_response") {
    update.resolved_at = new Date().toISOString();
  }
  // The database trigger moves the leak to notice_sent / removed as needed.
  const { data } = await db.from("takedown_notices").update(update).eq("id", noticeId).select("creator_id, leak_id").single();
  if (data) {
    await db.from("events").insert({ creator_id: data.creator_id, type: `notice.${status}`, payload: { notice_id: noticeId } });
  }
  return data;
}
