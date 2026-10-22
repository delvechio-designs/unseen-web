import Link from "next/link";
import { signOut } from "@/app/login/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your protection | Unseen", robots: { index: false, follow: false } };

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
      <div className="mb-10 flex items-center justify-between border-b border-edge pb-4">
        <nav className="flex gap-1">
          <Link href="/portal" className="rounded-md px-3 py-1.5 text-sm font-semibold text-haze hover:bg-panel hover:text-bone">Leaks</Link>
          <Link href="/portal/account" className="rounded-md px-3 py-1.5 text-sm font-semibold text-haze hover:bg-panel hover:text-bone">Account</Link>
        </nav>
        <form action={signOut}>
          <button className="text-sm font-semibold text-haze hover:text-bone">Sign out</button>
        </form>
      </div>
      {children}
    </div>
  );
}
