import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { canSendNotices } from "@/lib/activation";
import { buildNotice } from "@/lib/dmca";
import { sendNotice } from "@/lib/email";

// POST /api/admin/takedown
// {
//   "leakId": "<uuid>",
//   "recipientType": "host" | "registrar" | "cdn" | "search_engine" | "platform" | "other",
//   "recipientName": "Example Hosting Inc.",
//   "recipientContact": "abuse@example.net" or a form URL,
//   "method": "email" | "web_form" | "other",
//   "send": true          // email method only: sends now via Postmark
// }
// Always returns the notice text. For web forms, paste it into the form, then mark the notice
// sent in Supabase (status = sent) and the leak updates automatically.

const bodySchema = z.object({
  leakId: z.string().uuid(),
  recipientType: z.enum(["host", "registrar", "cdn", "search_engine", "platform", "other"]),
  recipientName: z.string().trim().min(2).max(160),
  recipientContact: z.string().trim().max(300).optional(),
  method: z.enum(["email", "web_form", "other"]),
  send: z.boolean().optional(),
});

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const input = parsed.data;
  const db = supabaseAdmin();

  const { data: leak } = await db
    .from("leaks")
    .select("id, url, creator_id, creators(display_name)")
    .eq("id", input.leakId)
    .single();
  if (!leak) return NextResponse.json({ error: "Leak not found" }, { status: 404 });

  const gate = await canSendNotices(leak.creator_id);
  if (!gate.ok) return NextResponse.json({ error: `Cannot send: ${gate.reason}` }, { status: 409 });

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
      recipient_contact: input.recipientContact ?? null,
      method: input.method,
      status: "draft",
      body,
    })
    .select("id")
    .single();

  if (error || !notice) {
    console.error("notice insert failed", error);
    return NextResponse.json({ error: "Could not save notice" }, { status: 500 });
  }

  let sent = false;
  if (input.send && input.method === "email") {
    const to = input.recipientContact ?? "";
    if (!z.string().email().safeParse(to).success) {
      return NextResponse.json({ error: "recipientContact must be an email to send", noticeId: notice.id, subject, body }, { status: 400 });
    }
    try {
      const result = await sendNotice({ to, subject, body });
      // Status change to 'sent' triggers the leak update in the database.
      await db.from("takedown_notices").update({ status: "sent", external_ref: result.MessageID }).eq("id", notice.id);
      sent = true;
    } catch (e) {
      console.error("notice send failed", e);
      return NextResponse.json({ error: "Saved as draft, but sending failed", noticeId: notice.id, subject, body }, { status: 502 });
    }
  }

  await db.from("events").insert({
    creator_id: leak.creator_id,
    type: sent ? "notice.sent" : "notice.drafted",
    payload: { notice_id: notice.id, leak_id: leak.id, recipient: input.recipientName, method: input.method },
  });

  return NextResponse.json({ ok: true, noticeId: notice.id, sent, subject, body });
}
