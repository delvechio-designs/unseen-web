import "server-only";
import { requireEnv } from "@/lib/env";

// Builds a DMCA takedown notice sent by Unseen as the creator's authorized agent.
// The creator's legal name is deliberately NOT included: the work is identified by stage name
// and the verified original platform URL, and the notice is signed by the agent.
// Have the lawyer review this wording before the first notice goes out.

export type NoticeInput = {
  stageName: string;
  originalUrls: string[]; // verified platform profile URLs
  infringingUrl: string;
  recipientName: string;
};

export function buildNotice(input: NoticeInput): { subject: string; body: string } {
  const agentName = requireEnv("AGENT_NAME");
  const agentAddress = requireEnv("AGENT_ADDRESS");
  const agentPhone = process.env.AGENT_PHONE ?? "";
  const agentEmail = requireEnv("NOTICE_FROM_EMAIL");
  const date = new Date().toISOString().slice(0, 10);

  const subject = `DMCA Takedown Notice: ${hostOf(input.infringingUrl)}`;

  const body = [
    `To: ${input.recipientName}`,
    `Date: ${date}`,
    ``,
    `Re: Notice of copyright infringement under 17 U.S.C. 512(c)(3)`,
    ``,
    `I am writing as the authorized agent of the copyright owner, who publishes as "${input.stageName}".`,
    ``,
    `1. Copyrighted work: original photographs and videos created and owned by the copyright owner and published at:`,
    ...input.originalUrls.map((u) => `   ${u}`),
    ``,
    `2. Infringing material: copies of that work published without authorization at:`,
    `   ${input.infringingUrl}`,
    ``,
    `Please remove or disable access to the material at the URL above.`,
    ``,
    `3. I have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.`,
    ``,
    `4. The information in this notice is accurate, and under penalty of perjury, I am authorized to act on behalf of the owner of the exclusive rights that are allegedly infringed.`,
    ``,
    `Contact:`,
    `   ${agentName}, authorized agent`,
    `   ${agentAddress}`,
    agentPhone ? `   ${agentPhone}` : null,
    `   ${agentEmail}`,
    ``,
    `Signed,`,
    `/${agentName}/`,
    `${agentName}, authorized agent for the copyright owner`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  return { subject, body };
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url;
  }
}
