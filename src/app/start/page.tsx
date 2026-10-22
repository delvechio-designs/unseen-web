import type { Metadata } from "next";
import SignupForm from "./SignupForm";

export const metadata: Metadata = { title: "Get protected | Unseen" };

export default function StartPage({
  searchParams,
}: {
  searchParams: { plan?: string; cancelled?: string };
}) {
  const plan = searchParams.plan === "pro" ? "pro" : "starter";
  return (
    <main className="mx-auto max-w-2xl px-4 pb-10 pt-12 sm:px-6 sm:pt-16">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-gold">Get protected</p>
      <h1 className="font-serif text-3xl sm:text-4xl">Let&apos;s get your content back</h1>
      <p className="mt-3 text-haze">Three short steps. No ID uploads. Your legal name never goes on a notice.</p>
      {searchParams.cancelled && (
        <p className="mt-6 rounded-md border border-edge bg-panel px-4 py-3 text-sm text-haze">
          Checkout was cancelled and you were not charged. You can sign up again below whenever you&apos;re ready.
        </p>
      )}
      <div className="mt-10">
        <SignupForm initialPlan={plan} />
      </div>
    </main>
  );
}
