import "server-only";
import { timingSafeEqual } from "crypto";

// Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set in the project.
export function isCron(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || expected.length < 16) return false;
  const header = req.headers.get("authorization") ?? "";
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${expected}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
