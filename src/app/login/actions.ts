"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nextRaw = String(formData.get("next") ?? "/portal");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/portal";
  if (!email) redirect("/login?error=missing");

  const { error } = await supabaseServer().auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error("magic link failed", error.message);
    redirect(`/login?error=send&next=${encodeURIComponent(next)}`);
  }
  redirect("/login?sent=1");
}

export async function signOut() {
  await supabaseServer().auth.signOut();
  redirect("/login");
}
