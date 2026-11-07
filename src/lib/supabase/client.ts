import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicConfig } from "@/lib/env";

/**
 * Browser Supabase client.
 *
 * Import this from Client Components only. Server Components, Server Actions,
 * Route Handlers, and the proxy must use `@/lib/supabase/server` so the client
 * is bound to the incoming request's cookies.
 *
 * The instance is cached at module scope. React renders, effects, and event
 * handlers share one client instead of creating a new client (and a new auth
 * listener) on every render.
 */

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    const { url, publishableKey } = getSupabasePublicConfig();
    browserClient = createBrowserClient(url, publishableKey);
  }

  return browserClient;
}
