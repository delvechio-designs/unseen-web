import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Magic link lands here; exchange the code for a session, then continue.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") ?? "/portal";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/portal";

  if (code) {
    const { error } = await supabaseServer().auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
