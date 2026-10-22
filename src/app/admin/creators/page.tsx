import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PageHeader, Table, Badge, Empty, fmtDate } from "@/components/admin/ui";

const STATUSES = ["all", "active", "pending_verification", "paused", "cancelled", "signup"];

export default async function Creators({ searchParams }: { searchParams: { q?: string; status?: string } }) {
  const db = supabaseAdmin();
  const status = STATUSES.includes(searchParams.status ?? "") ? searchParams.status! : "all";
  const q = (searchParams.q ?? "").trim().slice(0, 80);

  let query = db
    .from("creators")
    .select("id, display_name, email, plan, status, subscription_status, created_at, last_sweep_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status !== "all") query = query.eq("status", status);
  if (q) query = query.or(`display_name.ilike.%${q.replace(/[%,()]/g, "")}%,email.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const { data: creators } = await query;

  const ids = (creators ?? []).map((c) => c.id);
  const { data: openLeaks } = ids.length
    ? await db.from("leaks").select("creator_id").in("creator_id", ids).in("status", ["found", "notice_sent", "reappeared"])
    : { data: [] as { creator_id: string }[] };
  const openCount = new Map<string, number>();
  (openLeaks ?? []).forEach((l) => openCount.set(l.creator_id, (openCount.get(l.creator_id) ?? 0) + 1));

  return (
    <>
      <PageHeader title="Creators" sub={`${creators?.length ?? 0} shown`} />

      <form className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input name="q" defaultValue={q} placeholder="Search stage name or email" className="field sm:max-w-xs" />
        <select name="status" defaultValue={status} className="field sm:max-w-[220px]">
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <button className="btn-ghost">Filter</button>
      </form>

      {!creators?.length ? (
        <Empty>No creators match.</Empty>
      ) : (
        <Table head={["Stage name", "Email", "Plan", "Status", "Billing", "Open leaks", "Last sweep", "Joined"]}>
          {creators.map((c) => (
            <tr key={c.id} className="hover:bg-panel/60">
              <td className="px-4 py-3">
                <Link href={`/admin/creators/${c.id}`} className="font-semibold hover:text-gold">{c.display_name}</Link>
              </td>
              <td className="px-4 py-3 text-haze">{c.email}</td>
              <td className="px-4 py-3 capitalize">{c.plan}</td>
              <td className="px-4 py-3"><Badge value={c.status} /></td>
              <td className="px-4 py-3"><Badge value={c.subscription_status} /></td>
              <td className="px-4 py-3 font-mono">{openCount.get(c.id) ?? 0}</td>
              <td className="px-4 py-3 text-haze">{fmtDate(c.last_sweep_at) || "never"}</td>
              <td className="px-4 py-3 text-haze">{fmtDate(c.created_at)}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
