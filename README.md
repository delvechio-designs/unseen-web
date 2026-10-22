# Unseen

Leak and piracy takedown service for adult creators. Unseen finds leaked copies of a creator's paid content and sends DMCA notices as their authorized agent, then follows up until the content is removed.

Stack: Next.js 14 (App Router, TypeScript, Tailwind) on Vercel, Supabase (Postgres and Auth), Stripe subscriptions, Postmark, Brave Search API.

**Step-by-step account setup is in the Unseen Launch Checklist (Word doc).** This README is the technical reference.

## Ground rules built into the code

1. **No notice without verification.** A creator must have a verified platform account (code posted in their bio), a signed authorization, and an active subscription. Notice creation refuses otherwise.
2. **No legal names on notices.** Notices name the work by stage name and verified profile links, signed by Unseen as agent. The legal name lives only on the `authorizations` record.
3. **No media stored.** The database holds URLs and text notes only. Never download or screenshot leaked content. The monitor's recheck uses HEAD requests (status code only).
4. **Monitor results are candidates.** Automated finds stay hidden from the creator until an admin reviews them and sends a notice.
5. **Minors:** if anything appears to involve a minor, stop, do not open or download it, and report to the NCMEC CyberTipline.

## Areas of the app

| URL | Who | What |
|---|---|---|
| `/` | Public | Landing page |
| `/start` | Public | Three-step signup into Stripe Checkout |
| `/start/thanks` | Public | Verification codes |
| `/login` | Everyone | Magic link sign-in (Supabase Auth) |
| `/admin` | Emails in `ADMIN_EMAILS` | Overview queue: accounts to verify, leaks waiting for notices |
| `/admin/creators` | Admin | Search and filter creators; detail page with accounts, leaks, aliases, notes, report button |
| `/admin/leaks/[id]` | Admin | Create notices (prefilled from saved host contacts), copy text for web forms, update notice status |
| `/admin/followups` | Admin | Notices older than 7 days, rejected ones still up, links that came back |
| `/admin/hosts` | Admin | Saved abuse contacts per domain, and domains the monitor skips |
| `/portal` | Creators | Their leaks and progress, report new links |
| `/portal/account` | Creators | Plan, billing (Stripe portal), verification status, searched names |

## Background jobs (vercel.json)

| Job | Schedule (UTC) | What |
|---|---|---|
| `/api/cron/sweep` | Daily 10:00 | Sweeps creators that are due (Pro daily, Starter weekly) via Brave Search, then rechecks removed links |
| `/api/cron/followups` | Daily 15:00 | Emails the admin a digest of what needs attention |

Both require `CRON_SECRET`; Vercel sends it automatically. Without `BRAVE_SEARCH_API_KEY`, sweeps are skipped and rechecks still run.

## Code map

| Path | What it does |
|---|---|
| `src/lib/activation.ts` | The verification and activation gate |
| `src/lib/notices.ts` | Creating notices and updating their status (used by dashboard and API) |
| `src/lib/operations.ts` | Verify accounts, send reports, add leaks |
| `src/lib/dmca.ts` | Notice template (lawyer review before first use) |
| `src/lib/monitor/` | Search API client, sweeps, rechecks |
| `src/lib/auth.ts` | Admin and creator session checks; links a creator's login by email on first sign-in |
| `src/app/api/admin/*` | Script-friendly versions of dashboard actions (bearer `ADMIN_API_KEY`) |
| `supabase/migrations/` | Run in order: `..._init.sql`, then `..._admin_monitoring.sql` |

## Setup summary

1. `npm install`
2. Supabase, both projects: run both migrations in order in the SQL Editor (seed only on dev). In Authentication settings set the Site URL and add `<site>/auth/callback` as a redirect URL. For production, point Auth SMTP at Postmark so sign-in emails come from your domain.
3. Stripe: Starter and Pro monthly prices, customer portal on, webhook at `/api/stripe/webhook` with `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Confirm approval for this business first.
4. Postmark: server token, verified domain, an inbox for `NOTICE_FROM_EMAIL`.
5. `cp .env.example .env.local`, fill in dev values, `npm run dev`.
6. Vercel: import the repo, add every variable from `.env.example` with production values, deploy, add the domain.

## Daily operations

1. Open `/admin`. Verify accounts: open each profile link, confirm the code is in the bio, click Verify.
2. Work the leak queue. For each leak: confirm it's the creator's content, click Open, fill in the recipient (saved contacts prefill), create the notice. Email notices send immediately; for web forms (Google, Bing, many sites), copy the text, submit the form, then click Sent.
3. Check `/admin/followups`. Overdue: recheck the link, mark removed or escalate to the host, then the registrar or CDN.
4. Once a month: click "Email 30-day report" on each creator.

## Before launch

- [ ] Lawyer reviews: authorization wording (signup step 3), `src/lib/dmca.ts`, `/terms`, `/privacy`
- [ ] Stripe confirms approval for this business
- [ ] Agent name, address, and phone set
- [ ] Postmark domain verified; replies to the notice address reach you
- [ ] Supabase Auth redirect URLs set for production
- [ ] Never run `seed.sql` on production
