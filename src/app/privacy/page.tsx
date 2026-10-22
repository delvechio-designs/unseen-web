export const metadata = { title: "Privacy Policy | Unseen" };

// DRAFT. Replace with the version from the lawyer review before launch.
export default function Privacy() {
  const sections: [string, string][] = [
    [
      "What we collect",
      "Your stage names, email, creator account links, the leak links you send us or we find, and your signed authorization (your legal name, the time you signed, and your IP address). We do not collect ID documents.",
    ],
    [
      "What we never collect",
      "We never download, store, or screenshot your content or any copy of it. We work from links only.",
    ],
    [
      "How your legal name is used",
      "Only on your private authorization record, so we can prove we are authorized to act for you. It is not placed on takedown notices. Notices are signed by Unseen as your agent and identify your work by your stage name and account links.",
    ],
    [
      "Who we share with",
      "Takedown notices go to the websites, hosts, registrars, CDNs, and search engines involved in a leak. Payments are processed by Stripe and email is sent through Postmark. We do not sell your data or use it for advertising.",
    ],
    [
      "Retention and deletion",
      "We keep your records while you are a customer and for a limited period after, as needed to handle any follow-up on notices we sent. You can ask us to delete your data at any time by replying to any email from us.",
    ],
  ];
  return (
    <main className="mx-auto max-w-3xl px-4 pt-14 sm:px-6">
      <div className="mb-8 rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-bright">
        Draft pending legal review.
      </div>
      <h1 className="font-serif text-3xl sm:text-4xl">Privacy Policy</h1>
      <div className="mt-8 space-y-7 leading-relaxed text-haze">
        {sections.map(([h, p]) => (
          <section key={h}>
            <h2 className="mb-2 text-lg font-semibold text-bone">{h}</h2>
            <p>{p}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
