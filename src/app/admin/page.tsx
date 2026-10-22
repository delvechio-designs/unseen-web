import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLATFORM_LABELS } from "@/lib/signup-schema";
import { verifyAccountAction } from "./actions";
import SubmitButton from "@/components/SubmitButton";
import { PageHeader, Stat, Section, Empty, Table, Badge, fmtDate, smallBtn, smallGold } from "@/components/admin/ui";

export default async function AdminOverview() {
  const db = supabaseAdmin();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

  const [activeCreators, pendingAccounts, needNotice, staleNotices, pendingRows, queueRows] = await Promise.all([
    count(db.from("creators").select("id", { count: "exact", head: true }).eq("status", "active")),
    count(db.from("platform_accounts").select("id", { count: "exact", head: true }).eq("verification_status", "pending")),
    count(db.from("leaks").select("id", { count: "exact", head: true }).in("status", ["found", "reappeared"])),
    count(
      db.from("takedown_notices").select("id", { count: "exact", head: true }).in("status", ["sent", "acknowledged"]).lt("sent_at", weekAgo)
    ),
    db
      .from("platform_accounts")
      .select("id, platform, handle, profile_url, verification_code, created_at, creators(id, display_name, subscription_status)")
      .eq("verification_status", "pending")
      .order("created_at", { ascending: true })
      .limit(25),
    db
      .from("leaks")
      .select("id, url, domain, source, status, found_at, creators(id, display_name, status)")
      .in("status", ["found", "reappeared"])
      .order("found_at", { ascending: true })
      .limit(25),
  ]);

  type Pending = {
    id: string; platform: keyof typeof PLATFORM_LABELS; handle: string; profile_url: string; verification_code: string; created_at: string;
    creators: { id: string; display_name: string; subscription_status: string } | null;
  };
  type Queue = {
    id: string; url: string; domain: string; source: string; status: string; found_at: string;
    creators: { id: string; display_name: string; status: string } | null;
  };
  const pending = (pendingRows.data ?? []) as unknown as Pending[];
  const queue = (queueRows.data ?? []) as unknown as Queue[];

  return (
    <>
      <PageHeader title="Overview" sub="What needs you today." />

      <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active creators" value={activeCreators} href="/admin/creators?status=active" />
        <Stat label="Accounts to verify" value={pendingAccounts} />
        <Stat label="Leaks waiting for a notice" value={needNotice} />
        <Stat label="Notices over 7 days old" value={staleNotices} href="/admin/followups" />
      </div>

      <Section title="Verify accounts">
        {pending.length === 0 ? (
          <Empty>Nothing to verify.</Empty>
        ) : (
          <Table head={["Creator", "Account", "Code to look for", "Paid", ""]}>
            {pending.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3">
                  <Link href={`/admin/creators/${a.creators?.id}`} className="font-semibold hover:text-gold">{a.creators?.display_name}</Link>
                </td>
                <td className="px-4 py-3">
                  <a href={a.profile_url} target="_blank" rel="noopener noreferrer" className="underline decoration-edge hover:text-gold">
                    {PLATFORM_LABELS[a.platform]} @{a.handle}
                  </a>
                </td>
                <td className="px-4 py-3 font-mono text-gold">{a.verification_code}</td>
                <td className="px-4 py-3"><Badge value={a.creators?.subscription_status ?? "incomplete"} /></td>
                <td className="px-4 py-3">
                  <form action={verifyAccountAction} className="flex justify-end gap-2">
                    <input type="hidden" name="accountId" value={a.id} />
                    <SubmitButton className={smallGold} name="result" value="verified" pendingLabel="..." confirm="Did you see the code in their bio?">Verify</SubmitButton>
                    <SubmitButton className={smallBtn} name="result" value="failed" pendingLabel="...">Not there</SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </Table>
        )}
        <p className="mt-2 text-xs text-haze">Open the profile link, find the code in the bio, then click Verify. Never verify without seeing it.</p>
      </Section>

      <Section title="Leaks waiting for a notice">
        {queue.length === 0 ? (
          <Empty>Queue is clear.</Empty>
        ) : (
          <Table head={["Creator", "Domain", "Source", "Status", "Found", ""]}>
            {queue.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3">
                  <Link href={`/admin/creators/${l.creators?.id}`} className="hover:text-gold">{l.creators?.display_name}</Link>
                  {l.creators?.status !== "active" && <span className="ml-2"><Badge value={l.creators?.status ?? ""} /></span>}
                </td>
                <td className="px-4 py-3 font-mono text-[13px]">{l.domain}</td>
                <td className="px-4 py-3 text-haze">{l.source.replace(/_/g, " ")}</td>
                <td className="px-4 py-3"><Badge value={l.status} /></td>
                <td className="px-4 py-3 text-haze">{fmtDate(l.found_at)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/leaks/${l.id}`} className={smallGold}>Open</Link>
                </td>
              </tr>
            ))}
          </Table>
        )}
        <p className="mt-2 text-xs text-haze">Monitor results are candidates. Check each one is really the creator&apos;s content before sending a notice.</p>
      </Section>
    </>
  );
}
