export const metadata = { title: "Terms | Unseen" };

// DRAFT. Replace with the version from the lawyer review before launch.
export default function Terms() {
  const sections: [string, string][] = [
    [
      "Eligibility",
      "Unseen is for adult creators 18 and over who own or control the copyright in the content they ask us to protect.",
    ],
    [
      "Agent authorization",
      "By signing up you authorize Unseen to act as your agent to send copyright takedown notices for the content published on the accounts you list. We send notices only after you verify control of at least one of those accounts.",
    ],
    [
      "Your promises",
      "You confirm that you own or control the rights to the content, that everyone appearing in it was 18 or older and consented to its publication, and that the information you give us is accurate. False claims can create legal liability, so we may pause service if information cannot be verified.",
    ],
    [
      "What we do and don't promise",
      "We search for copies of your content, send notices, and follow up. Removal decisions are made by the sites, hosts, and search engines that receive them, so we cannot guarantee that every copy will be removed.",
    ],
    [
      "Billing and cancellation",
      "Plans are billed monthly through Stripe. You can cancel anytime; service continues to the end of the paid period. Fees already paid are not refunded.",
    ],
    [
      "Other situations",
      "Unseen handles piracy of content you published. For intimate images shared without consent, StopNCII.org may help. For images of anyone under 18, use NCMEC's Take It Down service. If we encounter material that appears to involve a minor, we report it to NCMEC.",
    ],
  ];
  return (
    <main className="mx-auto max-w-3xl px-4 pt-14 sm:px-6">
      <div className="mb-8 rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-bright">
        Draft pending legal review.
      </div>
      <h1 className="font-serif text-3xl sm:text-4xl">Terms of Service</h1>
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
