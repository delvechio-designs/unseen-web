import { z } from "zod";

export const PLATFORMS = ["onlyfans", "fansly", "patreon", "manyvids", "other"] as const;
export const PLANS = ["starter", "pro"] as const;

export const PLATFORM_LABELS: Record<(typeof PLATFORMS)[number], string> = {
  onlyfans: "OnlyFans",
  fansly: "Fansly",
  patreon: "Patreon",
  manyvids: "ManyVids",
  other: "Other",
};

// Placeholder prices. Real prices live in Stripe; keep these labels in sync.
export const PLAN_INFO: Record<(typeof PLANS)[number], { name: string; price: string; points: string[] }> = {
  starter: {
    name: "Starter",
    price: "$49",
    points: ["Weekly sweeps for your stage name", "Takedowns for every leak we find", "Monthly report"],
  },
  pro: {
    name: "Pro",
    price: "$99",
    points: [
      "Daily sweeps",
      "Search engine delisting (Google, Bing)",
      "Multiple stage names",
      "Priority handling",
    ],
  },
};

// Bump when the authorization wording in the signup form changes.
export const TERMS_VERSION = "2026-10-22";

const httpsUrl = z
  .string()
  .trim()
  .url()
  .max(300)
  .refine((u) => /^https?:\/\//i.test(u), "Must be a link");

export const signupSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200),
  aliases: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
  accounts: z
    .array(
      z.object({
        platform: z.enum(PLATFORMS),
        handle: z.string().trim().min(1).max(80),
        profileUrl: httpsUrl,
      })
    )
    .min(1, "Add at least one account")
    .max(6),
  knownLeaks: z.array(httpsUrl).max(20).default([]),
  plan: z.enum(PLANS),
  legalName: z.string().trim().min(3).max(120),
  attestAdult: z.literal(true),
  attestRights: z.literal(true),
  attestConsent: z.literal(true),
  authorizeAgent: z.literal(true),
  // Honeypot
  company_url: z.string().max(0).optional().or(z.literal("")),
});

export type SignupInput = z.infer<typeof signupSchema>;
