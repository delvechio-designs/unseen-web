import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PageHeader, Section, Table, Badge, Empty, fmtDate, daysAgo, smallGold } from "@/components/admin/ui";

export default async function Followups() {
  const db = supabaseAdmin();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [{ data: stale }, { data: reappeared }, { data: rejected }] = await Promise.all([
    db
      .from("takedown_notices")
      .select("id, leak_id, recipient_name, recipient_type, status, sent_at, leaks(domain), creators(display_name)")
      .in("status", ["sent", "acknowledged"])
      .lt("sent_at", weekAgo)
      .order("sent_at", { ascending: true })
      .limit(100),
    db
      .from("leaks")
      .select("id, domain, last_checked_at, creators(display_name)")
      .eq("status", "reappeared")
      .order("last_checked_at", { ascending: true })
      .limit(100),
    db
      .from("takedown_notices")
      .select("id, leak_id, recipient_name, status, resolved_at, leaks(domain, status), creators(display_name)")
      .in("status", ["rejected", "no_response"])
      .order("resolved_at", { ascending: false })
      .limit(50),
  ]);

  type N = { id: string; leak_id: string; recipient_name: string; recipient_type?: string; status: string; sent_at?: string; resolved_at?: string;
    leaks: { domain: string; status?: string } | null; creators: { display_name: string } | null };
  const staleRows = (stale ?? []) as unknown as N[];
  const rejectedRows = ((rejected ?? []) as unknown as N[]).filter((n) => n.leaks?.status !== "removed");
  const back = (reappeared ?? []) as unknown as { id: string; domain: string; last_checked_at: string; creators: { display_name: string } | null }[];

  return (
    <>
      <PageHeader title="Follow-ups" sub="Notices that need a nudge or an escalation." />

      <Section title="No result after 7 days">
        {!staleRows.length ? (
          <Empty>Nothing overdue.</Empty>
        ) : (
          <Table head={["Creator", "Domain", "Sent to", "Status", "Age", ""]}>
            {staleRows.map((n) => (
              <tr key={n.id}>
                <td className="px-4 py-3">{n.creators?.display_name}</td>
                <td className="px-4 py-3 font-mono text-[13px]">{n.leaks?.domain}</td>
                <td className="px-4 py-3">{n.recipient_name} <span className="text-haze">({n.recipient_type?.replace(/_/g, " ")})</span></td>
                <td className="px-4 py-3"><Badge value={n.status} /></td>
                <td className="px-4 py-3 font-mono">{daysAgo(n.sent_at)}d</td>
                <td className="px-4 py-3 text-right"><Link href={`/admin/leaks/${n.leak_id}`} className={smallGold}>Open</Link></td>
              </tr>
            ))}
          </Table>
        )}
        <p className="mt-2 text-xs text-haze">
          Check the link. If it&apos;s gone, mark the notice removed. If not, send a new notice one level up: the host, then the registrar or CDN.
        </p>
      </Section>

      <Section title="Rejected or ignored, still up">
        {!rejectedRows.length ? (
          <Empty>None.</Empty>
        ) : (
          <Table head={["Creator", "Domain", "Recipient", "Status", "Closed", ""]}>
            {rejectedRows.map((n) => (
              <tr key={n.id}>
                <td className="px-4 py-3">{n.creators?.display_name}</td>
                <td className="px-4 py-3 font-mono text-[13px]">{n.leaks?.domain}</td>
                <td className="px-4 py-3">{n.recipient_name}</td>
                <td className="px-4 py-3"><Badge value={n.status} /></td>
                <td className="px-4 py-3 text-haze">{fmtDate(n.resolved_at)}</td>
                <td className="px-4 py-3 text-right"><Link href={`/admin/leaks/${n.leak_id}`} className={smallGold}>Escalate</Link></td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Came back up">
        {!back.length ? (
          <Empty>No reappearances.</Empty>
        ) : (
          <Table head={["Creator", "Domain", "Detected", ""]}>
            {back.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3">{l.creators?.display_name}</td>
                <td className="px-4 py-3 font-mono text-[13px]">{l.domain}</td>
                <td className="px-4 py-3 text-haze">{fmtDate(l.last_checked_at)}</td>
                <td className="px-4 py-3 text-right"><Link href={`/admin/leaks/${l.id}`} className={smallGold}>Open</Link></td>
              </tr>
            ))}
          </Table>
        )}
        <p className="mt-2 text-xs text-haze">The monitor flags removed links that answer again. Confirm the content is actually back before re-sending.</p>
      </Section>
    </>
  );
}
