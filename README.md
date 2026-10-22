# Unseen

Leak and piracy takedown service for adult creators. Unseen finds leaked copies of a creator's paid content and sends DMCA notices as their authorized agent, then follows up until the content is removed.

Stack: Next.js 14 (App Router, TypeScript, Tailwind) on Vercel, Supabase (Postgres), Stripe subscriptions, Postmark.

## Ground rules built into the code

1. **No notice without verification.** A creator must have a verified platform account (code posted in their bio), a signed authorization, and an active subscription. `/api/admin/takedown` refuses otherwise.
2. **No legal names on notices.** Notices name the work by stage name and verified profile links, signed by Unseen as agent. The legal name lives only on the `authorizations` record.
3. **No media stored.** The database holds URLs and text notes only. Never download or screenshot leaked content.
4. **Minors:** if anything appears to involve a minor, stop, do not open or download it, and report to the NCMEC CyberTipline.

## What's in here

| Path | What it does |
|---|---|
| `src/app/page.tsx` | Landing page |
| `src/app/start/` | Three-step signup: you, your accounts, authorize. Redirects to Stripe Checkout |
| `src/app/start/thanks` | Shows the creator's verification codes |
| `src/app/api/signup` | Creates creator, aliases, accounts with codes, known leaks, authorization; opens checkout |
| `src/app/api/stripe/webhook` | Syncs subscription status and plan |
| `src/app/api/admin/verify-account` | Marks a platform account verified, activates the creator when ready |
| `src/app/api/admin/takedown` | Builds the DMCA notice for a leak, saves it, optionally emails it |
| `src/app/api/admin/report` | Emails a 30-day summary to the creator |
| `src/lib/dmca.ts` | Notice template (lawyer review before first use) |
| `src/lib/activation.ts` | The verification and activation gate |
| `supabase/migrations/` | Schema, triggers, row level security |

## Setup, step by step

1. **Install:** `npm install`
2. **Supabase (both projects, dev first):**
   1. SQL Editor: run `supabase/migrations/20261022010000_init.sql`.
   2. Dev only: run `supabase/seed.sql`.
   3. Copy the project URL, anon key, and service role key from Project Settings > API.
3. **Stripe:**
   1. Confirm with Stripe that your account is approved for this service before going live.
   2. Products: create Starter and Pro, each with a monthly recurring price. Copy both price IDs.
   3. Webhook endpoint `https://yourdomain.com/api/stripe/webhook` with events:
      `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
   4. Turn on the customer portal so creators can cancel from their billing emails.
   5. Local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. **Postmark:** create a server, verify your domain (DKIM and Return-Path), copy the server token. Set up an inbox for `NOTICE_FROM_EMAIL` so you see host replies.
5. **Env:** `cp .env.example .env.local`, fill in every value with dev keys.
6. **Run:** `npm run dev`, open http://localhost:3000
7. **Deploy:** push to GitHub, import into Vercel, add env vars with production keys, point the domain.

## Daily operations (Phase 1, manual)

All admin calls use: `-H "Authorization: Bearer $ADMIN_API_KEY" -H "Content-Type: application/json"`

**Verify a new creator**
1. Open the creator's profile link from `platform_accounts`. Confirm the bio shows their `verification_code`.
2. `curl -X POST https://yourdomain.com/api/admin/verify-account ... -d '{"platformAccountId":"<id>"}'`
   (add `"failed": true` if the code isn't there). The creator activates automatically once they've also paid.

**Sweep for leaks**
1. Search engines: stage name and each alias, plus words like leak, leaked, free, mega, onlyfans.
2. Reverse image search the creator's own public promo images.
3. Known leak sites and forums: search the stage name.
4. Add each hit as a row in `leaks` (url, domain, source = `manual_search`). Do not open or download media.

**Send a notice**
1. Find who to send to: the site's own DMCA or abuse contact first; otherwise look up the host with a WHOIS or hosting lookup and use its abuse address.
2. `curl -X POST https://yourdomain.com/api/admin/takedown ... -d '{"leakId":"<id>","recipientType":"host","recipientName":"Example Host","recipientContact":"abuse@example.net","method":"email","send":true}'`
3. Search engines and form-only sites: use `"method":"web_form"`, paste the returned `body` into the form, then set that notice's status to `sent` in Supabase.

**Follow up**
1. After 7 days, recheck notices still at `sent`. If the content is down, set the notice status to `removed`; the leak updates itself.
2. No response: send a new notice to the registrar or CDN (`recipientType` `registrar` or `cdn`).
3. Recheck removed leaks monthly. If back up, set the leak status to `reappeared` and send again.

**Monthly report**
`curl -X POST https://yourdomain.com/api/admin/report ... -d '{"creatorId":"<id>"}'`

## Before launch

- [ ] Lawyer reviews: authorization wording (signup step 3), `src/lib/dmca.ts` notice template, `/terms`, `/privacy`
- [ ] Stripe confirms approval for this business
- [ ] Agent name, address, and phone set
- [ ] Postmark domain verified; replies to the notice address reach you
- [ ] Never run `seed.sql` on production
