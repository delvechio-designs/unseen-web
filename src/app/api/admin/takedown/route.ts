import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { createNotice, noticeInputSchema } from "@/lib/notices";

// POST /api/admin/takedown
// { leakId, recipientType, recipientName, recipientContact?, method, send?, saveContact? }
// Same logic as the dashboard's "Create notice" form. Returns the notice text either way.

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = noticeInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const result = await createNotice(parsed.data);
  if (!result.ok) {
    const { status, ...rest } = result;
    return NextResponse.json(rest, { status });
  }
  return NextResponse.json(result);
}
