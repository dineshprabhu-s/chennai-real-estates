import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getSupabasePublicConfig } from "@/lib/env";

export interface SupabaseProxyClient {
  /** Client bound to the incoming request's cookies. */
  supabase: SupabaseClient;
  /**
   * The response that carries cookies refreshed by Supabase. Call this after
   * awaiting an auth method such as `getClaims()`.
   */
  getResponse: () => NextResponse;
}

/**
 * Creates a request/response-bound Supabase client for `src/proxy.ts`.
 *
 * Supabase refreshes access tokens while auth methods run. The refreshed
 * cookies and the cache headers supplied by `@supabase/ssr` are written to a
 * `NextResponse` that must be returned (or merged into a redirect/rewrite
 * response) so the browser and CDN see the new session.
 */
export function createSupabaseProxyClient(
  request: NextRequest,
): SupabaseProxyClient {
  const { url, publishableKey } = getSupabasePublicConfig();

  // `setAll` can deliver the cache headers only on the first cookie write.
  // Keep them so they survive if the response is rebuilt on a later write.
  const cacheHeaders = new Map<string, string>();
  const refreshedCookies = new Map<
    string,
    { name: string; value: string; options: CookieOptions }
  >();
  let response = NextResponse.next({ request });

  const applyCacheHeaders = () => {
    for (const [name, value] of cacheHeaders) {
      response.headers.set(name, value);
    }
  };

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          refreshedCookies.set(name, { name, value, options });
        }

        // Rebuild the response so the updated request cookies are forwarded
        // to the route while every refreshed cookie is set on the response.
        response = NextResponse.next({ request });

        for (const { name, value, options } of refreshedCookies.values()) {
          response.cookies.set(name, value, options);
        }

        for (const [name, value] of Object.entries(headers)) {
          cacheHeaders.set(name, value);
        }

        applyCacheHeaders();
      },
    },
  });

  return {
    supabase,
    getResponse: () => response,
  };
}

/**
 * Copies refreshed Supabase cookies and cache headers onto another response,
 * such as a redirect. Next.js internal `x-middleware-*` headers are skipped so
 * they do not change how the new response is handled.
 */
export function applySupabaseResponse(
  source: NextResponse,
  target: NextResponse,
): NextResponse {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }

  source.headers.forEach((value, name) => {
    const normalizedName = name.toLowerCase();

    if (
      normalizedName === "set-cookie" ||
      normalizedName.startsWith("x-middleware-")
    ) {
      return;
    }

    target.headers.set(name, value);
  });

  return target;
}
