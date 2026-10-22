import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin-auth";
import { setVerification } from "@/lib/operations";

// POST /api/admin/verify-account  { "platformAccountId": "<uuid>", "failed"?: true }
// Call only after you have personally seen the verification code in the account's bio.

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = z
    .object({ platformAccountId: z.string().uuid(), failed: z.boolean().optional() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "platformAccountId required" }, { status: 400 });

  const result = await setVerification(parsed.data.platformAccountId, parsed.data.failed === true);
  if (!result) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  return NextResponse.json({ ok: true, creatorActive: result.creatorActive });
}
