import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "@/app/login/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin | Unseen", robots: { index: false, follow: false } };

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/creators", label: "Creators" },
  { href: "/admin/followups", label: "Follow-ups" },
  { href: "/admin/hosts", label: "Hosts" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <div className="mb-10 flex flex-col gap-4 border-b border-edge pb-4 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap gap-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 text-sm font-semibold text-haze hover:bg-panel hover:text-bone">
              {n.label}
            </Link>
          ))}
        </nav>
        <form action={signOut} className="flex items-center gap-3 text-sm text-haze">
          <span className="hidden sm:inline">{user.email}</span>
          <button className="font-semibold hover:text-bone">Sign out</button>
        </form>
      </div>
      {children}
    </div>
  );
}
