import Link from "next/link";
import { PLAN_INFO, PLANS } from "@/lib/signup-schema";

// Illustrative status log for the hero. Not real cases.
const log = [
  { domain: "tube-mirror.example", status: "Removed", tone: "text-emerald-400" },
  { domain: "leakforum.example", status: "Removed", tone: "text-emerald-400" },
  { domain: "filelocker.example", status: "Notice sent", tone: "text-gold" },
  { domain: "Google search result", status: "Delisted", tone: "text-emerald-400" },
  { domain: "imagehost.example", status: "Escalated to host", tone: "text-haze" },
];

const steps = [
  {
    n: "01",
    title: "Sign up and verify",
    body: "Tell us your stage names and accounts. You post a short code in your bio so we know it's really you. No ID uploads.",
  },
  {
    n: "02",
    title: "We search",
    body: "We sweep leak sites, tube sites, forums, file lockers, and search results for your content, on a schedule.",
  },
  {
    n: "03",
    title: "We file takedowns",
    body: "Every copy gets a DMCA notice to the site, its host, or the search engine, signed by us as your agent. Not with your legal name.",
  },
  {
    n: "04",
    title: "We follow up",
    body: "Unanswered notices get escalated to the host, registrar, or CDN. Removed links get rechecked in case they come back.",
  },
];

const faqs = [
  {
    q: "Does my real name go on the notices?",
    a: "No. Notices identify your work by your stage name and your official account links, and we sign them as your authorized agent. Your legal name stays on your private authorization record with us.",
  },
  {
    q: "Why do I have to post a code in my bio?",
    a: "It proves you control the account. That stops anyone from using Unseen to file notices pretending to be you, and it means we never need a copy of your ID.",
  },
  {
    q: "Do you download or store my content?",
    a: "Never. We track links and send notices. We don't download, host, or screenshot your content.",
  },
  {
    q: "Can every leak be removed?",
    a: "Most hosts and search engines act on valid notices. Some sites ignore them, and for those we go after the host, registrar, CDN, and search listings so the copies get much harder to find. Nobody can honestly promise 100%.",
  },
  {
    q: "What if images of me were shared without my consent, or I was under 18?",
    a: "That's not piracy, and there are faster, free paths. StopNCII.org helps adults block intimate images from being shared on major platforms. If you were under 18 in the images, use NCMEC's Take It Down service. We'll point you to the right one.",
  },
  {
    q: "Can I cancel?",
    a: "Anytime, from the link in your billing emails. Protection runs to the end of your paid month.",
  },
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:pt-24">
        <div>
          <p className="mb-6 font-mono text-xs uppercase tracking-[0.25em] text-gold">Leak takedowns for creators</p>
          <h1 className="font-serif text-[2.7rem] leading-[1.05] sm:text-[4.2rem]">
            Your content was made to be paid for.
            <span className="mt-2 block text-haze">
              Not <span className="redact px-2">leaked for free</span>.
            </span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-haze">
            We find your content on leak sites and search results, file the takedowns for you, and follow up until
            it&apos;s gone. You keep creating. We keep it where it belongs.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/start" className="btn">Get protected</Link>
            <a href="#how" className="btn-ghost">How it works</a>
          </div>
        </div>

        <div className="rounded-xl border border-edge bg-panel p-6 shadow-[0_30px_60px_-30px_rgba(0,0,0,.8)] sm:p-7">
          <div className="mb-5 flex items-baseline justify-between border-b border-edge pb-4">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-haze">Takedown log</span>
            <span className="font-mono text-xs text-haze/70">example</span>
          </div>
          <ul className="space-y-4 font-mono text-[13px]">
            {log.map((l) => (
              <li key={l.domain} className="flex items-center justify-between gap-4">
                <span className="truncate text-bone/90">{l.domain}</span>
                <span className={`shrink-0 ${l.tone}`}>{l.status}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-edge pt-4 text-xs leading-relaxed text-haze/80">
            Illustration of how your monthly report tracks each notice.
          </p>
        </div>
      </section>

      {/* How */}
      <section id="how" className="border-y border-edge bg-panel/50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-serif text-3xl sm:text-4xl">How it works</h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n}>
                <div className="font-mono text-sm text-gold">{s.n}</div>
                <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-haze">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy promise */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            ["Your name stays private", "Notices go out under our name as your agent, never your legal name."],
            ["No ID uploads", "You verify with a code in your bio. We never ask for a photo of your ID."],
            ["We never touch your content", "We track links only. Nothing is downloaded, stored, or screenshotted."],
          ].map(([t, b]) => (
            <div key={t} className="rounded-lg border border-edge p-6">
              <div className="font-semibold">{t}</div>
              <p className="mt-2 text-sm leading-relaxed text-haze">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-edge">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-serif text-3xl sm:text-4xl">Simple monthly plans</h2>
          <p className="mt-3 text-haze">Cancel anytime. Every leak we find gets a takedown, on every plan.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {PLANS.map((p) => {
              const info = PLAN_INFO[p];
              const featured = p === "pro";
              return (
                <div
                  key={p}
                  className={`rounded-xl border p-7 ${featured ? "border-gold/60 bg-panel" : "border-edge"}`}
                >
                  <div className="flex items-baseline justify-between">
                    <div className="text-lg font-semibold">{info.name}</div>
                    {featured && <div className="font-mono text-xs uppercase tracking-widest text-gold">Most coverage</div>}
                  </div>
                  <div className="mt-4">
                    <span className="font-serif text-5xl">{info.price}</span>
                    <span className="text-haze"> / month</span>
                  </div>
                  <ul className="mt-6 space-y-2.5 text-[15px]">
                    {info.points.map((pt) => (
                      <li key={pt} className="flex gap-3">
                        <span className="text-gold">&#10003;</span>
                        <span className="text-bone/90">{pt}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={`/start?plan=${p}`} className={`mt-8 w-full ${featured ? "btn" : "btn-ghost"}`}>
                    Choose {info.name}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-edge">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <h2 className="font-serif text-3xl sm:text-4xl">Questions</h2>
          <div className="mt-8 divide-y divide-edge border-y border-edge">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                  {f.q}
                  <span className="font-mono text-haze transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-haze">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-xl border border-gold/30 bg-panel px-6 py-14 text-center sm:px-12">
          <h2 className="font-serif text-3xl sm:text-4xl">Take your content back</h2>
          <p className="mx-auto mt-4 max-w-xl text-haze">Sign up in about five minutes. We start with any leaks you already know about.</p>
          <Link href="/start" className="btn mt-8">Get protected</Link>
        </div>
      </section>
    </main>
  );
}
