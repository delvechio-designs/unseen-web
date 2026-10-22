import "server-only";
import { timingSafeEqual } from "crypto";

// Simple bearer key for internal admin routes until the Phase 2 dashboard adds real login.
export function isAdmin(req: Request): boolean {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || expected.length < 24) return false;
  const header = req.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
