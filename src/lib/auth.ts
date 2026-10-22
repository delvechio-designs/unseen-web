import "server-only";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function currentUser() {
  try {
    const {
      data: { user },
    } = await supabaseServer().auth.getUser();
    return user;
  } catch {
    return null;
  }
}

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | undefined | null): boolean {
  return !!email && adminEmails().includes(email.toLowerCase());
}

// Use at the top of every admin page and server action.
export async function requireAdmin() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdminEmail(user.email)) redirect("/login?error=not_admin");
  return user;
}

export type PortalCreator = {
  id: string;
  display_name: string;
  email: string;
  plan: "starter" | "pro";
  status: string;
  subscription_status: string;
  current_period_end: string | null;
  stripe_customer_id: string | null;
};

// Returns the creator linked to the signed-in user. On first login, links the account by email.
export async function requireCreator(): Promise<PortalCreator | null> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/portal");
  if (!user.email) return null;

  const db = supabaseAdmin();
  const cols = "id, display_name, email, plan, status, subscription_status, current_period_end, stripe_customer_id";

  const { data: linked } = await db.from("creators").select(cols).eq("auth_user_id", user.id).maybeSingle();
  if (linked) return linked as PortalCreator;

  // Magic link proves the user controls this email, so link the most recent unlinked creator with it.
  const { data: match } = await db
    .from("creators")
    .select(cols)
    .is("auth_user_id", null)
    .ilike("email", user.email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!match) return null;
  await db.from("creators").update({ auth_user_id: user.id }).eq("id", match.id);
  await db.from("events").insert({ creator_id: match.id, type: "portal.linked", payload: {} });
  return match as PortalCreator;
}
