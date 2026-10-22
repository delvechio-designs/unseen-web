import { sendMagicLink } from "./actions";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Sign in | Unseen" };

const ERRORS: Record<string, string> = {
  not_admin: "That email isn't an admin account.",
  link: "That sign-in link expired or was already used. Request a new one.",
  missing: "Enter your email.",
  send: "We couldn't send the link. Try again in a minute.",
};

export default function Login({
  searchParams,
}: {
  searchParams: { next?: string; error?: string; sent?: string };
}) {
  const next = searchParams.next?.startsWith("/") ? searchParams.next : "/portal";
  return (
    <main className="mx-auto max-w-md px-4 pt-20 sm:px-6">
      <h1 className="font-serif text-3xl">Sign in</h1>
      {searchParams.sent ? (
        <p className="mt-6 rounded-lg border border-edge bg-panel px-5 py-4 leading-relaxed text-haze">
          Check your inbox. We sent you a sign-in link. It works once and expires in an hour.
        </p>
      ) : (
        <>
          <p className="mt-3 text-haze">Use the email you signed up with. We&apos;ll email you a one-time link.</p>
          {searchParams.error && (
            <p className="mt-6 rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
              {ERRORS[searchParams.error] ?? "Something went wrong."}
            </p>
          )}
          <form action={sendMagicLink} className="mt-8 space-y-4">
            <input type="hidden" name="next" value={next} />
            <input className="field" type="email" name="email" placeholder="you@example.com" required autoComplete="email" />
            <SubmitButton className="btn w-full" pendingLabel="Sending...">Email me a sign-in link</SubmitButton>
          </form>
        </>
      )}
    </main>
  );
}
