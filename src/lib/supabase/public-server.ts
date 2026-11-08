import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/env";

/** A fresh client with no access to request cookies or browser sessions. */
export function createPublicSupabaseClient() {
  const { url, publishableKey } = getSupabasePublicConfig();
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
