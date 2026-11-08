"use server";

import { redirect } from "next/navigation";

import { requireBroker } from "@/lib/auth/broker";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Ends the current broker session.
 *
 * The authorization guard runs before `signOut()` so this action cannot be
 * invoked by an unauthenticated visitor to clear a session. Cookies are
 * writable inside a Server Action, so Supabase can remove the session cookies
 * from the response before the redirect to the public login page.
 */
export async function logoutAction(): Promise<void> {
  await requireBroker();

  const supabase = await createSupabaseServerClient();

  // `local` clears this device's cookies before revoking the refresh token on
  // the server, so the browser session ends even if the network call fails.
  await supabase.auth.signOut({ scope: "local" });

  redirect("/admin/login");
}
