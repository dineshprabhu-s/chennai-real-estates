import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublicConfig } from "@/lib/env";

/**
 * Request-scoped server Supabase client.
 *
 * Always call this once per request/render and never cache the result in a
 * module-level variable: the client reads and writes cookies for the current
 * request.
 *
 * Server Components cannot mutate cookies. Token refreshes that attempt to
 * write therefore throw and are ignored here. Once authentication is added,
 * session renewal must happen in `src/proxy.ts` (or a Server Action / Route
 * Handler) where cookies are writable.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabasePublicConfig();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called while rendering a Server Component, where cookies are
          // read-only. This is expected; the proxy is responsible for
          // refreshing session cookies once authentication is implemented.
        }
      },
    },
  });
}
