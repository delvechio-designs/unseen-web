import { requireCreator } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import SubmitButton from "@/components/SubmitButton";
import NoCreator from "@/components/NoCreator";
import { reportLeaksAction } from "./actions";
import { Stat, Section, Badge, Empty, Flash, fmtDate } from "@/components/admin/ui";

const LABELS: Record<string, string> = {
  found: "Found, notice coming",
  notice_sent: "Notice sent",
  removed: "Removed",
  rejected: "Escalating",
  reappeared: "Back up, re-sending",
};

export default async function PortalHome({ searchParams }: { searchParams: { reported?: string } }) {
  const creator = await requireCreator();
  if (!creator) return <NoCreator />;

  // Reads go through row level security: a creator can only ever see their own rows.
  const db = supabaseServer();
  const { data: leaks } = await db
    .from("leaks")
    .select("id, domain, status, found_at, removed_at")
    .neq("status", "ignored")
    // Hide unreviewed monitor hits until an admin confirms them by sending a notice
    .or("source.neq.monitor,status.neq.found")
    .order("found_at", { ascending: false })
    .limit(300);

  const all = leaks ?? [];
  const removed = all.filter((l) => l.status === "removed").length;
  const working = all.filter((l) => ["found", "notice_sent", "rejected", "reappeared"].includes(l.status)).length;
  const monthAgo = Date.now() - 30 * 86_400_000;
  const recent = all.filter((l) => new Date(l.found_at).getTime() > monthAgo).length;
  const reported = searchParams.reported;

  return (
    <>
      <div className="mb-8">
        <h1 className="font-serif text-3xl">Hi {creator.display_name}</h1>
        <p className="mt-1 text-sm text-haze">
          {creator.status === "active"
            ? "Protection is active."
            : creator.status === "pending_verification"
              ? "Waiting on verification. Check your account page for your code."
              : `Status: ${creator.status.replace(/_/g, " ")}`}
        </p>
      </div>

      {reported !== undefined && (
        <Flash>{Number(reported) > 0 ? `Thanks. ${reported} link(s) added to your queue.` : "Those links were already on file or couldn't be added."}</Flash>
      )}

      <div className="mb-10 grid grid-cols-3 gap-3 sm:gap-4">
        <Stat label="Removed" value={removed} />
        <Stat label="In progress" value={working} />
        <Stat label="Found this month" value={recent} />
      </div>

      <Section title="Report a leak">
        <form action={reportLeaksAction} className="rounded-lg border border-edge p-4">
          <textarea name="urls" required className="field min-h-[90px] font-mono text-[13px]" placeholder="Paste links, one per line" />
          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="text-xs text-haze">We check each one, then send the takedown.</p>
            <SubmitButton className="btn" pendingLabel="Sending...">Send links</SubmitButton>
          </div>
        </form>
      </Section>

      <Section title="Your leaks">
        {!all.length ? (
          <Empty>Nothing yet. Our sweeps are running, and anything we find shows up here.</Empty>
        ) : (
          <ul className="divide-y divide-edge rounded-lg border border-edge">
            {all.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate font-mono text-[13px]">{l.domain}</div>
                  <div className="text-xs text-haze">
                    Found {fmtDate(l.found_at)}
                    {l.removed_at && ` · removed ${fmtDate(l.removed_at)}`}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge value={l.status} />
                  <span className="hidden text-[11px] text-haze sm:block">{LABELS[l.status]}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
