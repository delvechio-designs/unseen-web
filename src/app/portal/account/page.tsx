import { requireCreator } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { PLATFORM_LABELS, PLAN_INFO } from "@/lib/signup-schema";
import SubmitButton from "@/components/SubmitButton";
import NoCreator from "@/components/NoCreator";
import { billingPortalAction } from "../actions";
import { Section, Badge, Flash, fmtDate } from "@/components/admin/ui";

export default async function PortalAccount({ searchParams }: { searchParams: { error?: string } }) {
  const creator = await requireCreator();
  if (!creator) return <NoCreator />;

  const db = supabaseServer();
  const [{ data: accounts }, { data: aliases }] = await Promise.all([
    db.from("platform_accounts").select("id, platform, handle, profile_url, verification_code, verification_status").order("created_at"),
    db.from("creator_aliases").select("alias").order("alias"),
  ]);

  return (
    <>
      <h1 className="mb-8 font-serif text-3xl">Account</h1>
      {searchParams.error === "billing" && <Flash tone="error">Billing isn&apos;t set up for this account yet. Reply to any of our emails and we&apos;ll sort it.</Flash>}

      <Section title="Plan">
        <div className="flex flex-col gap-4 rounded-lg border border-edge p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold">
              {PLAN_INFO[creator.plan].name} <span className="font-mono text-sm text-gold">{PLAN_INFO[creator.plan].price}/mo</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-haze">
              <Badge value={creator.subscription_status} />
              {creator.current_period_end && <span>renews {fmtDate(creator.current_period_end)}</span>}
            </div>
          </div>
          <form action={billingPortalAction}>
            <SubmitButton className="btn-ghost" pendingLabel="Opening...">Manage billing</SubmitButton>
          </form>
        </div>
        <p className="mt-2 text-xs text-haze">Change your card, switch plans, or cancel through Stripe&apos;s secure billing page.</p>
      </Section>

      <Section title="Verified accounts">
        <ul className="divide-y divide-edge rounded-lg border border-edge">
          {(accounts ?? []).map((a) => (
            <li key={a.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                {PLATFORM_LABELS[a.platform as keyof typeof PLATFORM_LABELS]} <span className="text-haze">@{a.handle}</span>
              </div>
              <div className="flex items-center gap-3">
                {a.verification_status !== "verified" && (
                  <span className="select-all font-mono text-sm text-gold">{a.verification_code}</span>
                )}
                <Badge value={a.verification_status} />
              </div>
            </li>
          ))}
        </ul>
        {(accounts ?? []).some((a) => a.verification_status !== "verified") && (
          <p className="mt-2 text-xs text-haze">Put the code in that account&apos;s bio, then reply to our verification email.</p>
        )}
      </Section>

      <Section title="Names we search for">
        <ul className="flex flex-wrap gap-2">
          <li className="rounded border border-gold/40 px-2 py-1 text-sm">{creator.display_name}</li>
          {(aliases ?? []).map((a) => <li key={a.alias} className="rounded border border-edge px-2 py-1 text-sm">{a.alias}</li>)}
        </ul>
        <p className="mt-2 text-xs text-haze">Want us to search another name? Reply to any of our emails.</p>
      </Section>
    </>
  );
}
