import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLATFORM_LABELS } from "@/lib/signup-schema";

export const metadata = { title: "Verify your account | Unseen" };
export const dynamic = "force-dynamic";

type Row = { platform: keyof typeof PLATFORM_LABELS; handle: string; verification_code: string };

async function loadCodes(creatorId: string | undefined): Promise<Row[]> {
  if (!creatorId || !/^[0-9a-f-]{36}$/.test(creatorId)) return [];
  try {
    const { data } = await supabaseAdmin()
      .from("platform_accounts")
      .select("platform, handle, verification_code")
      .eq("creator_id", creatorId)
      .eq("verification_status", "pending");
    return (data ?? []) as Row[];
  } catch {
    return [];
  }
}

export default async function Thanks({ searchParams }: { searchParams: { c?: string } }) {
  const codes = await loadCodes(searchParams.c);

  return (
    <main className="mx-auto max-w-xl px-4 pt-16 sm:px-6">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-gold">Almost done</p>
      <h1 className="font-serif text-3xl sm:text-4xl">One last step: verify</h1>
      <p className="mt-4 leading-relaxed text-haze">
        Add your code to the bio of each account, then reply to the email we just sent you. Once we see it, protection
        starts and you can remove the code.
      </p>

      {codes.length > 0 ? (
        <ul className="mt-8 divide-y divide-edge rounded-lg border border-edge bg-panel">
          {codes.map((c) => (
            <li key={c.verification_code} className="flex items-center justify-between gap-4 px-5 py-4">
              <span className="text-sm">
                {PLATFORM_LABELS[c.platform]} <span className="text-haze">@{c.handle}</span>
              </span>
              <span className="select-all font-mono text-gold">{c.verification_code}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 rounded-lg border border-edge bg-panel px-5 py-4 text-sm text-haze">
          Your codes are in the email we sent you.
        </p>
      )}

      <Link href="/" className="btn-ghost mt-10">Back to home</Link>
    </main>
  );
}
