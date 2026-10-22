import Link from "next/link";

// Small shared pieces for the admin and portal screens.

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-haze">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const inner = (
    <div className="rounded-lg border border-edge bg-panel p-5 transition hover:border-bone/30">
      <div className="font-serif text-4xl">{value}</div>
      <div className="mt-1 text-sm text-haze">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const TONES: Record<string, string> = {
  active: "border-emerald-700/60 text-emerald-300",
  verified: "border-emerald-700/60 text-emerald-300",
  removed: "border-emerald-700/60 text-emerald-300",
  sent: "border-gold/50 text-gold",
  notice_sent: "border-gold/50 text-gold",
  acknowledged: "border-gold/50 text-gold",
  pending: "border-sky-700/60 text-sky-300",
  pending_verification: "border-sky-700/60 text-sky-300",
  found: "border-sky-700/60 text-sky-300",
  draft: "border-edge text-haze",
  reappeared: "border-orange-700/60 text-orange-300",
  past_due: "border-orange-700/60 text-orange-300",
  paused: "border-orange-700/60 text-orange-300",
  failed: "border-red-800 text-red-300",
  rejected: "border-red-800 text-red-300",
  canceled: "border-red-800 text-red-300",
  cancelled: "border-red-800 text-red-300",
  no_response: "border-red-800 text-red-300",
  ignored: "border-edge text-haze",
};

export function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 font-mono text-[11px] ${TONES[value] ?? "border-edge text-haze"}`}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-edge px-5 py-6 text-sm text-haze">{children}</p>;
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-edge">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-edge bg-panel text-xs uppercase tracking-wider text-haze">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-edge">{children}</tbody>
      </table>
    </div>
  );
}

export function Flash({ children, tone = "ok" }: { children: React.ReactNode; tone?: "ok" | "error" }) {
  return (
    <p
      className={`mb-6 rounded-md border px-4 py-3 text-sm ${
        tone === "ok" ? "border-emerald-800 bg-emerald-950/40 text-emerald-200" : "border-red-900 bg-red-950/50 text-red-300"
      }`}
    >
      {children}
    </p>
  );
}

export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

export const daysAgo = (d: string | null | undefined) =>
  d ? Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000) : null;

export const smallBtn = "rounded-md border border-edge px-3 py-1.5 text-xs font-semibold text-bone transition hover:border-bone/60 disabled:opacity-40";
export const smallGold = "rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-night transition hover:bg-gold-bright disabled:opacity-40";
