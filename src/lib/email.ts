import "server-only";
import { ServerClient } from "postmark";
import { requireEnv, siteUrl } from "@/lib/env";

let cached: ServerClient | null = null;

function client(): ServerClient {
  if (cached) return cached;
  cached = new ServerClient(requireEnv("POSTMARK_SERVER_TOKEN"));
  return cached;
}

function wrap(body: string) {
  return `<!doctype html><html><body style="margin:0;background:#0B0C0F;font-family:system-ui,sans-serif;color:#E9E6E1">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#15171C;border:1px solid #2A2D35;border-radius:10px">
  <tr><td style="padding:28px 32px;font-size:15px;line-height:1.6">
  <div style="font-weight:700;letter-spacing:.2em;margin-bottom:22px">UNSEEN</div>
  ${body}
  <p style="color:#8B8F99;font-size:13px;margin-top:28px">Unseen &middot; <a href="${siteUrl()}" style="color:#C9A86A">${siteUrl().replace(/^https?:\/\//, "")}</a></p>
  </td></tr></table></td></tr></table></body></html>`;
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

const from = () => requireEnv("POSTMARK_FROM_EMAIL");

export async function sendVerificationInstructions(opts: {
  to: string;
  displayName: string;
  accounts: { platformLabel: string; handle: string; code: string }[];
}) {
  const rows = opts.accounts
    .map(
      (a) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #2A2D35">${escapeHtml(a.platformLabel)} @${escapeHtml(a.handle)}</td>
         <td align="right" style="padding:8px 0;border-bottom:1px solid #2A2D35;font-family:monospace;color:#C9A86A">${escapeHtml(a.code)}</td></tr>`
    )
    .join("");
  await client().sendEmail({
    From: from(),
    To: opts.to,
    Subject: "One step left: verify your account",
    MessageStream: "outbound",
    HtmlBody: wrap(`
      <p>Hi ${escapeHtml(opts.displayName)},</p>
      <p>Before we send any takedown notices, we confirm you control the accounts you listed. This protects you: nobody can use Unseen to file notices in your name.</p>
      <ol>
        <li>Add the code below to the bio of each account.</li>
        <li>Reply to this email when it's up.</li>
        <li>We check, confirm, and you can remove the code.</li>
      </ol>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:16px 0">${rows}</table>
      <p>Already know where your content is leaked? Reply with the links and we'll start there.</p>`),
    TextBody:
      `Hi ${opts.displayName},\n\nAdd these codes to the bio of each account, then reply to this email:\n\n` +
      opts.accounts.map((a) => `${a.platformLabel} @${a.handle}: ${a.code}`).join("\n") +
      `\n\nWe check, confirm, and you can remove the code afterward.`,
  });
}

export async function sendAdminNewSignup(opts: {
  displayName: string;
  email: string;
  plan: string;
  accounts: number;
  knownLeaks: number;
  creatorId: string;
}) {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) return;
  await client().sendEmail({
    From: from(),
    To: to,
    Subject: `New signup: ${opts.displayName} (${opts.plan})`,
    MessageStream: "outbound",
    TextBody: [
      `Stage name: ${opts.displayName}`,
      `Email: ${opts.email}`,
      `Plan: ${opts.plan}`,
      `Accounts to verify: ${opts.accounts}`,
      `Known leaks submitted: ${opts.knownLeaks}`,
      `Creator ID: ${opts.creatorId}`,
    ].join("\n"),
  });
}

export async function sendWelcome(to: string, displayName: string) {
  await client().sendEmail({
    From: from(),
    To: to,
    Subject: "You're verified. We're on it.",
    MessageStream: "outbound",
    HtmlBody: wrap(`
      <p>Hi ${escapeHtml(displayName)},</p>
      <p>Your account is verified and protection is active. You can take the code out of your bio now.</p>
      <p>Our first sweep is underway. Every leak we find gets a takedown notice, and we follow up until it comes down. You'll get a report each month.</p>
      <p>Spot a leak yourself? Reply with the link anytime.</p>`),
  });
}

export async function sendNotice(opts: { to: string; subject: string; body: string }) {
  return client().sendEmail({
    From: requireEnv("NOTICE_FROM_EMAIL"),
    To: opts.to,
    Subject: opts.subject,
    MessageStream: "outbound",
    TextBody: opts.body,
  });
}

export async function sendMonthlyReport(opts: {
  to: string;
  displayName: string;
  found: number;
  sent: number;
  removed: number;
  pending: number;
}) {
  const cell = (label: string, n: number) =>
    `<td align="center" style="padding:14px 8px;border:1px solid #2A2D35"><div style="font-size:26px;font-weight:700">${n}</div><div style="color:#8B8F99;font-size:12px">${label}</div></td>`;
  await client().sendEmail({
    From: from(),
    To: opts.to,
    Subject: `Your Unseen report: ${opts.removed} removed`,
    MessageStream: "outbound",
    HtmlBody: wrap(`
      <p>Hi ${escapeHtml(opts.displayName)},</p>
      <p>Here's the last 30 days.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse"><tr>
        ${cell("Leaks found", opts.found)}${cell("Notices sent", opts.sent)}${cell("Removed", opts.removed)}${cell("Still pending", opts.pending)}
      </tr></table>
      <p>Pending notices get followed up and escalated to the host's registrar or CDN when they go unanswered.</p>`),
  });
}
