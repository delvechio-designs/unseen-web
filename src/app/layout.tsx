import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Unseen | Leak takedowns for creators",
  description:
    "We find your leaked content and get it taken down. DMCA notices filed for you, followed up until it's gone.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-edge">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
            <Link href="/" className="text-[15px] font-bold tracking-[0.3em]">
              UNSEEN
            </Link>
            <Link href="/start" className="text-sm font-semibold text-gold hover:text-gold-bright">
              Get protected
            </Link>
          </div>
        </header>
        {children}
        <footer className="mt-24 border-t border-edge">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-haze sm:flex-row sm:justify-between sm:px-6">
            <span>&copy; {new Date().getFullYear()} Unseen. For creators 18 and over.</span>
            <nav className="flex gap-5">
              <Link href="/privacy" className="hover:text-bone">Privacy</Link>
              <Link href="/terms" className="hover:text-bone">Terms</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
