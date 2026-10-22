import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLATFORM_LABELS } from "@/lib/signup-schema";
import SubmitButton from "@/components/SubmitButton";
import {
  verifyAccountAction,
  sendReportAction,
  addLeaksAction,
  setLeakStatusAction,
  addAliasAction,
  removeAliasAction,
  setCreatorStatusAction,
  saveNotesAction,
} from "../../actions";
import { PageHeader, Section, Table, Badge, Empty, Flash, fmtDate, smallBtn, smallGold } from "@/components/admin/ui";

export default async function CreatorDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { flash?: string };
}) {
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound();
  const db = supabaseAdmin();

  const [{ data: c }, { data: accounts }, { data: aliases }, { data: auth }, { data: leaks }, { data: events }] = await Promise.all([
    db.from("creators").select("*").eq("id", params.id).single(),
    db.from("platform_accounts").select("*").eq("creator_id", params.id).order("created_at"),
    db.from("creator_aliases").select("id, alias").eq("creator_id", params.id).order("alias"),
    db.from("authorizations").select("signed_name, signed_at, terms_version, ip_address").eq("creator_id", params.id).order("signed_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("leaks").select("id, url, domain, source, status, found_at, removed_at").eq("creator_id", params.id).order("found_at", { ascending: false }).limit(300),
    db.from("events").select("type, created_at").eq("creator_id", params.id).order("created_at", { ascending: false }).limit(15),
  ]);
  if (!c) notFound();

  const flash = searchParams.flash;
  const flashText =
    flash === "report_sent" ? "Report emailed." : flash?.startsWith("leaks_") ? `${flash.slice(6)} new leak(s) added.` : null;

  const counts = (leaks ?? []).reduce<Record<string, number>>((acc, l) => ((acc[l.status] = (acc[l.status] ?? 0) + 1), acc), {});

  return (
    <>
      <PageHeader title={c.display_name} sub={`${c.email} · joined ${fmtDate(c.created_at)}`}>
        <Badge value={c.status} />
        <Badge value={c.subscription_status} />
        <span className="rounded border border-edge px-2 py-0.5 font-mono text-[11px] capitalize text-haze">{c.plan}</span>
      </PageHeader>

      {flashText && <Flash>{flashText}</Flash>}

      <div className="mb-10 flex flex-wrap gap-2">
        <form action={sendReportAction}>
          <input type="hidden" name="creatorId" value={c.id} />
          <SubmitButton className={smallBtn} pendingLabel="Sending...">Email 30-day report</SubmitButton>
        </form>
        {c.status === "active" && (
          <form action={setCreatorStatusAction}>
            <input type="hidden" name="creatorId" value={c.id} />
            <input type="hidden" name="status" value="paused" />
            <SubmitButton className={smallBtn} confirm="Pause this creator? Notices will be blocked.">Pause</SubmitButton>
          </form>
        )}
        {c.status === "paused" && c.subscription_status === "active" && (
          <form action={setCreatorStatusAction}>
            <input type="hidden" name="creatorId" value={c.id} />
            <input type="hidden" name="status" value="active" />
            <SubmitButton className={smallBtn}>Unpause</SubmitButton>
          </form>
        )}
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <Section title="Accounts">
            {!accounts?.length ? (
              <Empty>No accounts.</Empty>
            ) : (
              <ul className="divide-y divide-edge rounded-lg border border-edge">
                {accounts.map((a) => (
                  <li key={a.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <a href={a.profile_url} target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-edge hover:text-gold">
                        {PLATFORM_LABELS[a.platform as keyof typeof PLATFORM_LABELS]} @{a.handle}
                      </a>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <Badge value={a.verification_status} />
                        <span className="font-mono text-gold">{a.verification_code}</span>
                        {a.verified_at && <span className="text-haze">verified {fmtDate(a.verified_at)}</span>}
                      </div>
                    </div>
                    {a.verification_status !== "verified" && (
                      <form action={verifyAccountAction} className="flex gap-2">
                        <input type="hidden" name="accountId" value={a.id} />
                        <SubmitButton className={smallGold} name="result" value="verified" pendingLabel="..." confirm="Did you see the code in their bio?">Verify</SubmitButton>
                        <SubmitButton className={smallBtn} name="result" value="failed" pendingLabel="...">Not there</SubmitButton>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={`Leaks (${leaks?.length ?? 0})`}>
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              {Object.entries(counts).map(([s, n]) => (
                <span key={s} className="flex items-center gap-1"><Badge value={s} /> <span className="text-haze">{n}</span></span>
              ))}
            </div>
            {!leaks?.length ? (
              <Empty>No leaks logged yet.</Empty>
            ) : (
              <Table head={["Domain", "Status", "Source", "Found", ""]}>
                {leaks.map((l) => (
                  <tr key={l.id}>
                    <td className="max-w-[260px] px-4 py-3">
                      <div className="truncate font-mono text-[13px]" title={l.url}>{l.domain}</div>
                    </td>
                    <td className="px-4 py-3"><Badge value={l.status} /></td>
                    <td className="px-4 py-3 text-haze">{l.source.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-haze">{fmtDate(l.found_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/leaks/${l.id}`} className={smallGold}>Open</Link>
                        {l.status === "found" && (
                          <form action={setLeakStatusAction}>
                            <input type="hidden" name="leakId" value={l.id} />
                            <input type="hidden" name="status" value="ignored" />
                            <SubmitButton className={smallBtn} pendingLabel="...">Not theirs</SubmitButton>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
            <form action={addLeaksAction} className="mt-4 rounded-lg border border-edge p-4">
              <input type="hidden" name="creatorId" value={c.id} />
              <label className="mb-2 block text-sm font-semibold">Add leaks you found</label>
              <textarea name="urls" className="field min-h-[90px] font-mono text-[13px]" placeholder="Paste links, one per line" required />
              <div className="mt-3 flex justify-end">
                <SubmitButton className={smallGold} pendingLabel="Adding...">Add leaks</SubmitButton>
              </div>
            </form>
          </Section>
        </div>

        <div>
          <Section title="Search names">
            <ul className="mb-3 flex flex-wrap gap-2">
              <li className="rounded border border-gold/40 px-2 py-1 text-sm">{c.display_name}</li>
              {(aliases ?? []).map((a) => (
                <li key={a.id} className="flex items-center gap-1 rounded border border-edge px-2 py-1 text-sm">
                  {a.alias}
                  <form action={removeAliasAction}>
                    <input type="hidden" name="aliasId" value={a.id} />
                    <input type="hidden" name="creatorId" value={c.id} />
                    <button className="px-1 text-haze hover:text-red-300" aria-label={`Remove ${a.alias}`}>&times;</button>
                  </form>
                </li>
              ))}
            </ul>
            <form action={addAliasAction} className="flex gap-2">
              <input type="hidden" name="creatorId" value={c.id} />
              <input name="alias" className="field" placeholder="Add another name" />
              <SubmitButton className={smallBtn} pendingLabel="...">Add</SubmitButton>
            </form>
          </Section>

          <Section title="Authorization">
            {auth ? (
              <dl className="space-y-1 rounded-lg border border-edge p-4 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-haze">Signed by</dt><dd>{auth.signed_name}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-haze">Signed</dt><dd>{fmtDate(auth.signed_at)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-haze">Terms version</dt><dd className="font-mono">{auth.terms_version}</dd></div>
                <p className="pt-2 text-xs text-haze">Private record. The legal name never goes on a notice without the creator&apos;s case-by-case OK.</p>
              </dl>
            ) : (
              <Flash tone="error">No authorization on file. Notices are blocked.</Flash>
            )}
          </Section>

          <Section title="Notes">
            <form action={saveNotesAction}>
              <input type="hidden" name="creatorId" value={c.id} />
              <textarea name="notes" defaultValue={c.notes ?? ""} className="field min-h-[100px] text-sm" />
              <div className="mt-2 flex justify-end"><SubmitButton className={smallBtn} pendingLabel="Saving...">Save notes</SubmitButton></div>
            </form>
          </Section>

          <Section title="Recent activity">
            {!events?.length ? (
              <Empty>No activity yet.</Empty>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {events.map((e, i) => (
                  <li key={i} className="flex justify-between gap-4">
                    <span className="font-mono text-[12px]">{e.type}</span>
                    <span className="text-haze">{fmtDate(e.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
