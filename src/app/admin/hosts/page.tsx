import { supabaseAdmin } from "@/lib/supabase/admin";
import SubmitButton from "@/components/SubmitButton";
import { saveDomainRuleAction, deleteDomainRuleAction } from "../actions";
import { RECIPIENT_TYPES } from "@/lib/notices";
import { PageHeader, Section, Table, Badge, Empty, Flash, smallBtn } from "@/components/admin/ui";

export default async function Hosts({ searchParams }: { searchParams: { error?: string } }) {
  const { data: rules } = await supabaseAdmin().from("domain_rules").select("*").order("rule").order("domain");

  return (
    <>
      <PageHeader title="Hosts and domains" sub="Saved abuse contacts, and domains the monitor should skip." />
      {searchParams.error && <Flash tone="error">Enter a valid domain like example.com</Flash>}

      <Section title="Add or update a domain">
        <form action={saveDomainRuleAction} className="grid gap-3 rounded-lg border border-edge p-5 sm:grid-cols-2">
          <input name="domain" placeholder="example.com" className="field" required />
          <select name="rule" className="field" defaultValue="leak_site">
            <option value="leak_site">Leak site (save contact)</option>
            <option value="ignore">Ignore (monitor skips it)</option>
          </select>
          <select name="recipientType" className="field" defaultValue="">
            <option value="">Recipient type</option>
            {RECIPIENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
          <input name="recipientName" placeholder="Recipient name" className="field" />
          <input name="abuseContact" placeholder="Abuse email or form link" className="field" />
          <select name="contactMethod" className="field" defaultValue="">
            <option value="">Method</option>
            <option value="email">Email</option>
            <option value="web_form">Web form</option>
            <option value="other">Other</option>
          </select>
          <input name="notes" placeholder="Notes (response time, quirks)" className="field sm:col-span-2" />
          <div className="sm:col-span-2 flex justify-end">
            <SubmitButton className="btn" pendingLabel="Saving...">Save domain</SubmitButton>
          </div>
        </form>
      </Section>

      <Section title={`Saved (${rules?.length ?? 0})`}>
        {!rules?.length ? (
          <Empty>Nothing saved yet. Contacts get saved here automatically when you tick &quot;Remember this contact&quot; on a notice.</Empty>
        ) : (
          <Table head={["Domain", "Rule", "Recipient", "Contact", "Notes", ""]}>
            {rules.map((r) => (
              <tr key={r.domain}>
                <td className="px-4 py-3 font-mono text-[13px]">{r.domain}</td>
                <td className="px-4 py-3"><Badge value={r.rule === "ignore" ? "ignored" : "found"} /></td>
                <td className="px-4 py-3">{r.recipient_name}</td>
                <td className="max-w-[220px] truncate px-4 py-3 text-haze" title={r.abuse_contact ?? ""}>{r.abuse_contact}</td>
                <td className="max-w-[200px] truncate px-4 py-3 text-haze">{r.notes}</td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteDomainRuleAction}>
                    <input type="hidden" name="domain" value={r.domain} />
                    <SubmitButton className={smallBtn} pendingLabel="..." confirm={`Delete ${r.domain}?`}>Delete</SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </>
  );
}
