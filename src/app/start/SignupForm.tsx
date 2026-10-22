"use client";

import { useState } from "react";
import Link from "next/link";
import { PLATFORMS, PLATFORM_LABELS, PLANS, PLAN_INFO } from "@/lib/signup-schema";

type Platform = (typeof PLATFORMS)[number];
type Plan = (typeof PLANS)[number];
type Account = { platform: Platform; handle: string; profileUrl: string };

const STEP_LABELS = ["You", "Your accounts", "Authorize"];
const isUrl = (s: string) => /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(s.trim());

export default function SignupForm({ initialPlan }: { initialPlan: Plan }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [aliasText, setAliasText] = useState("");
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [accounts, setAccounts] = useState<Account[]>([{ platform: "onlyfans", handle: "", profileUrl: "" }]);
  const [leakText, setLeakText] = useState("");
  const [legalName, setLegalName] = useState("");
  const [attestAdult, setAttestAdult] = useState(false);
  const [attestRights, setAttestRights] = useState(false);
  const [attestConsent, setAttestConsent] = useState(false);
  const [authorizeAgent, setAuthorizeAgent] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const aliases = aliasText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  const leaks = leakText.split(/\s+/).map((s) => s.trim()).filter(Boolean);
  const badLeaks = leaks.filter((l) => !isUrl(l));

  const step0Valid = displayName.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const step1Valid =
    accounts.length > 0 &&
    accounts.every((a) => a.handle.trim() && isUrl(a.profileUrl)) &&
    badLeaks.length === 0 &&
    leaks.length <= 20;
  const step2Valid =
    legalName.trim().length >= 3 && attestAdult && attestRights && attestConsent && authorizeAgent;

  function updateAccount(i: number, patch: Partial<Account>) {
    setAccounts((cur) => cur.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          email,
          aliases,
          accounts,
          knownLeaks: leaks,
          plan,
          legalName,
          attestAdult,
          attestRights,
          attestConsent,
          authorizeAgent,
          company_url: honeypot,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <ol className="mb-10 grid grid-cols-3 gap-2">
        {STEP_LABELS.map((label, i) => (
          <li key={label}>
            <div className={`h-1 rounded-full ${i <= step ? "bg-gold" : "bg-edge"}`} />
            <div className={`mt-2 text-xs sm:text-sm ${i === step ? "font-semibold text-bone" : "text-haze"}`}>{label}</div>
          </li>
        ))}
      </ol>

      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
        name="company_url"
      />

      {step === 0 && (
        <div className="space-y-6">
          <Field label="Stage name" hint="The main name your content is published under." required>
            <input className="field" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </Field>
          <Field label="Email" hint="Where we send verification steps and reports." required>
            <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field label="Other names you use" hint="Optional. Old stage names or spellings leakers use. Separate with commas.">
            <input className="field" value={aliasText} onChange={(e) => setAliasText(e.target.value)} />
          </Field>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold">Plan</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {PLANS.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={plan === p}
                  onClick={() => setPlan(p)}
                  className={`rounded-lg border px-4 py-3.5 text-left transition ${
                    plan === p ? "border-gold bg-gold/5 ring-1 ring-gold" : "border-edge bg-panel hover:border-bone/40"
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">{PLAN_INFO[p].name}</span>
                    <span className="font-mono text-sm text-gold">{PLAN_INFO[p].price}/mo</span>
                  </div>
                  <div className="mt-1 text-sm text-haze">{PLAN_INFO[p].points[0]}</div>
                </button>
              ))}
            </div>
          </fieldset>

          <Nav onNext={() => setStep(1)} nextDisabled={!step0Valid} />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-8">
          <div>
            <div className="mb-1 text-sm font-semibold">Your creator accounts</div>
            <p className="mb-4 text-sm text-haze">
              We&apos;ll give you a code to post in each bio so we can confirm they&apos;re yours.
            </p>
            <div className="space-y-3">
              {accounts.map((a, i) => (
                <div key={i} className="rounded-lg border border-edge bg-panel p-4">
                  <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                    <select
                      className="field"
                      value={a.platform}
                      onChange={(e) => updateAccount(i, { platform: e.target.value as Platform })}
                      aria-label="Platform"
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                      ))}
                    </select>
                    <input
                      className="field"
                      placeholder="@handle"
                      value={a.handle}
                      onChange={(e) => updateAccount(i, { handle: e.target.value })}
                      aria-label="Handle"
                    />
                  </div>
                  <input
                    className="field mt-3"
                    placeholder="https://link-to-your-profile"
                    value={a.profileUrl}
                    onChange={(e) => updateAccount(i, { profileUrl: e.target.value })}
                    aria-label="Profile link"
                  />
                  {accounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setAccounts((cur) => cur.filter((_, j) => j !== i))}
                      className="mt-3 text-xs font-semibold text-haze hover:text-bone"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            {accounts.length < 6 && (
              <button
                type="button"
                onClick={() => setAccounts((cur) => [...cur, { platform: "fansly", handle: "", profileUrl: "" }])}
                className="mt-3 text-sm font-semibold text-gold hover:text-gold-bright"
              >
                + Add another account
              </button>
            )}
          </div>

          <Field label="Leaks you already know about" hint="Optional. Paste links, one per line. We start with these.">
            <textarea
              className="field min-h-[110px] font-mono text-[13px]"
              value={leakText}
              onChange={(e) => setLeakText(e.target.value)}
              placeholder="https://..."
            />
            {badLeaks.length > 0 && (
              <p className="mt-2 text-sm text-red-400">These don&apos;t look like links: {badLeaks.slice(0, 3).join(", ")}</p>
            )}
            {leaks.length > 20 && <p className="mt-2 text-sm text-red-400">Up to 20 for now. Send the rest by email after signup.</p>}
          </Field>

          <Nav onBack={() => setStep(0)} onNext={() => setStep(2)} nextDisabled={!step1Valid} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-7">
          <div className="rounded-lg border border-edge bg-panel p-5 text-sm leading-relaxed text-haze">
            To file takedown notices for you, we need your written authorization. Your legal name is stored only on
            this private record. Notices are signed by Unseen as your agent and identify your work by stage name.
          </div>

          <Field label="Full legal name (your signature)" required>
            <input className="field" value={legalName} onChange={(e) => setLegalName(e.target.value)} autoComplete="name" />
          </Field>

          <div className="space-y-4">
            <Check checked={attestAdult} onChange={setAttestAdult}>I am 18 or older.</Check>
            <Check checked={attestRights} onChange={setAttestRights}>
              I own or control the copyright in the content published on the accounts I listed.
            </Check>
            <Check checked={attestConsent} onChange={setAttestConsent}>
              Everyone who appears in that content was 18 or older when it was made and consented to it being published.
            </Check>
            <Check checked={authorizeAgent} onChange={setAuthorizeAgent}>
              I authorize Unseen to act as my agent to send copyright takedown notices for this content, and I agree to
              the <Link href="/terms" target="_blank" className="underline">Terms</Link> and{" "}
              <Link href="/privacy" target="_blank" className="underline">Privacy Policy</Link>.
            </Check>
          </div>

          <p className="text-xs leading-relaxed text-haze/80">
            Images shared without your consent, or of anyone under 18, need a different path. See StopNCII.org or
            NCMEC&apos;s Take It Down. Takedowns start after your account is verified.
          </p>

          {error && <p className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">{error}</p>}

          <Nav
            onBack={() => setStep(1)}
            onNext={submit}
            nextDisabled={!step2Valid || submitting}
            nextLabel={submitting ? "Opening checkout..." : `Continue to payment (${PLAN_INFO[plan].price}/mo)`}
          />
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold">
        {label} {required && <span className="text-gold">*</span>}
      </span>
      {hint && <span className="mb-2 mt-0.5 block text-sm text-haze">{hint}</span>}
      {!hint && <span className="mb-1.5 block" />}
      {children}
    </label>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-relaxed">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1.5 h-4 w-4 shrink-0 accent-[#C9A86A]"
      />
      <span>{children}</span>
    </label>
  );
}

function Nav({
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Continue",
}: {
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      {onBack ? (
        <button type="button" onClick={onBack} className="text-sm font-semibold text-haze hover:text-bone">Back</button>
      ) : (
        <span />
      )}
      <button type="button" onClick={onNext} disabled={nextDisabled} className="btn">{nextLabel}</button>
    </div>
  );
}
