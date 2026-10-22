import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import SubmitButton from "@/components/SubmitButton";
import CopyButton from "@/components/CopyButton";
import { createNoticeAction, setNoticeStatusAction, setLeakStatusAction } from "../../actions";
import { RECIPIENT_TYPES } from "@/lib/notices";
import { PageHeader, Section, Badge, Empty, Flash, fmtDate, daysAgo, smallBtn, smallGold } from "@/components/admin/ui";

const SEARCH_FORMS = [
  { name: "Google", note: "Google's copyright removal form (search 'Google DMCA report content')" },
  { name: "Bing", note: "Bing's copyright infringement form (search 'Bing DMCA notice')" },
];

export default async function LeakDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { notice?: string; error?: string; flash?: string };
}) {
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound();
  const db = supabaseAdmin();

  const { data: leak } = await db
    .from("leaks")
    .select("*, creators(id, display_name, status)")
    .eq("id", params.id)
    .single();
  if (!leak) notFound();
  const creator = leak.creators as { id: string; display_name: string; status: string };

  const [{ data: notices }, { data: rule }] = await Promise.all([
    db.from("takedown_notices").select("*").eq("leak_id", leak.id).order("created_at", { ascending: false }),
    db.from("domain_rules").select("*").eq("domain", leak.domain).maybeSingle(),
  ]);

  const highlighted = notices?.find((n) => n.id === searchParams.notice);

  return (
    <>
      <div className="mb-4 text-sm">
        <Link href={`/admin/creators/${creator.id}`} className="text-haze hover:text-bone">&larr; {creator.display_name}</Link>
      </div>
      <PageHeader title={leak.domain} sub={`Found ${fmtDate(leak.found_at)} · ${leak.source.replace(/_/g, " ")}`}>
        <Badge value={leak.status} />
      </PageHeader>

      {searchParams.error && <Flash tone="error">{searchParams.error}</Flash>}
      {searchParams.flash === "sent" && <Flash>Notice emailed.</Flash>}

      <div className="mb-8 rounded-lg border border-edge bg-panel p-4">
        <div className="mb-1 text-xs uppercase tracking-wider text-haze">Leak URL</div>
        <div className="flex items-start justify-between gap-3">
          <code className="break-all text-[13px]">{leak.url}</code>
          <CopyButton text={leak.url} />
        </div>
        <p className="mt-3 text-xs text-haze">
          Check it&apos;s really this creator&apos;s content before sending. Don&apos;t download anything. If it looks like it involves a minor, stop and report to the NCMEC CyberTipline.
        </p>
        {leak.notes && <p className="mt-2 text-xs text-haze">Notes: {leak.notes}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {["found", "reappeared", "notice_sent"].includes(leak.status) && (
            <>
              <form action={setLeakStatusAction}>
                <input type="hidden" name="leakId" value={leak.id} />
                <input type="hidden" name="status" value="removed" />
                <SubmitButton className={smallBtn} pendingLabel="...">Mark removed</SubmitButton>
              </form>
              <form action={setLeakStatusAction}>
                <input type="hidden" name="leakId" value={leak.id} />
                <input type="hidden" name="status" value="ignored" />
                <SubmitButton className={smallBtn} pendingLabel="..." confirm="Mark as not this creator's content?">Not theirs</SubmitButton>
              </form>
            </>
          )}
          {leak.status === "removed" && (
            <form action={setLeakStatusAction}>
              <input type="hidden" name="leakId" value={leak.id} />
              <input type="hidden" name="status" value="reappeared" />
              <SubmitButton className={smallBtn} pendingLabel="...">It&apos;s back up</SubmitButton>
            </form>
          )}
        </div>
      </div>

      {highlighted && (
        <Section title="Notice text" action={<CopyButton text={highlighted.body} label="Copy notice" />}>
          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border border-gold/40 bg-panel p-4 font-mono text-[12.5px] leading-relaxed">
            {highlighted.body}
          </pre>
          {highlighted.status === "draft" && (
            <p className="mt-2 text-xs text-haze">
              Web form? Paste this into the form, submit it, then click &quot;Sent&quot; on this notice below.
            </p>
          )}
        </Section>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
        <Section title="New notice">
          <form action={createNoticeAction} className="space-y-4 rounded-lg border border-edge p-5">
            <input type="hidden" name="leakId" value={leak.id} />
            {rule?.abuse_contact && <p className="text-xs text-emerald-300">Prefilled from saved contact for {leak.domain}.</p>}
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Send to</span>
              <select name="recipientType" defaultValue={rule?.recipient_type ?? "host"} className="field">
                {RECIPIENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Recipient name</span>
              <input name="recipientName" defaultValue={rule?.recipient_name ?? ""} placeholder="e.g. Example Hosting Inc. or the site name" className="field" required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Abuse email or form link</span>
              <input name="recipientContact" defaultValue={rule?.abuse_contact ?? ""} placeholder="abuse@example.net" className="field" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">How it&apos;s sent</span>
              <select name="method" defaultValue={rule?.contact_method ?? "email"} className="field">
                <option value="email">Email</option>
                <option value="web_form">Web form (I&apos;ll paste it)</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="send" defaultChecked className="h-4 w-4 accent-[#C9A86A]" />
              Email it now (email method only)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="saveContact" defaultChecked={!rule} className="h-4 w-4 accent-[#C9A86A]" />
              Remember this contact for {leak.domain}
            </label>
            {creator.status !== "active" && <Flash tone="error">Creator isn&apos;t active ({creator.status}). Notices are blocked.</Flash>}
            <SubmitButton className="btn w-full" pendingLabel="Creating..." confirm="Send this notice? Make sure it's this creator's content.">
              Create notice
            </SubmitButton>
          </form>
          <div className="mt-4 rounded-lg border border-edge p-4 text-xs leading-relaxed text-haze">
            <div className="mb-1 font-semibold text-bone">Search engine delisting</div>
            {SEARCH_FORMS.map((f) => <div key={f.name}>{f.name}: {f.note}. Use &quot;Web form&quot; above, recipient type &quot;search engine&quot;.</div>)}
          </div>
        </Section>

        <Section title={`Notices (${notices?.length ?? 0})`}>
          {!notices?.length ? (
            <Empty>No notices yet.</Empty>
          ) : (
            <ul className="space-y-3">
              {notices.map((n) => {
                const age = daysAgo(n.sent_at);
                return (
                  <li key={n.id} className={`rounded-lg border p-4 ${n.id === highlighted?.id ? "border-gold/50" : "border-edge"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{n.recipient_name}</div>
                        <div className="text-xs text-haze">
                          {n.recipient_type.replace(/_/g, " ")} · {n.method.replace(/_/g, " ")}
                          {n.recipient_contact ? ` · ${n.recipient_contact}` : ""}
                        </div>
                      </div>
                      <Badge value={n.status} />
                    </div>
                    <div className="mt-2 text-xs text-haze">
                      Created {fmtDate(n.created_at)}
                      {n.sent_at && ` · sent ${fmtDate(n.sent_at)} (${age}d ago)`}
                      {n.external_ref && ` · ref ${n.external_ref}`}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {n.id !== highlighted?.id && (
                        <Link href={`/admin/leaks/${leak.id}?notice=${n.id}`} className={smallBtn}>View text</Link>
                      )}
                      {(["sent", "acknowledged", "removed", "rejected", "no_response"] as const)
                        .filter((s) => s !== n.status)
                        .map((s) => (
                          <form key={s} action={setNoticeStatusAction}>
                            <input type="hidden" name="noticeId" value={n.id} />
                            <input type="hidden" name="status" value={s} />
                            <SubmitButton className={s === "removed" ? smallGold : smallBtn} pendingLabel="...">
                              {s.replace(/_/g, " ")}
                            </SubmitButton>
                          </form>
                        ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
