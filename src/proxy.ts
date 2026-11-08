import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  applySupabaseResponse,
  createSupabaseProxyClient,
} from "@/lib/supabase/proxy";
const loginPath = /^\/admin\/login\/?$/;

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function redirectToLogin(
  request: NextRequest,
  supabaseResponse: NextResponse,
  options: { next?: string; notBroker?: boolean },
): NextResponse {
  const loginUrl = new URL("/admin/login", request.url);

  if (options.notBroker) {
    loginUrl.searchParams.set("error", "not-broker");
  }

  if (options.next) {
    loginUrl.searchParams.set("next", options.next);
  }

  return applySupabaseResponse(
    supabaseResponse,
    NextResponse.redirect(loginUrl),
  );
}

async function handleAdminRequest(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  const { supabase, getResponse } = createSupabaseProxyClient(request);

  // Awaiting an auth method lets Supabase refresh an expiring access token and
  // write the refreshed cookies to the response returned by `getResponse()`.
  const { data, error } = await supabase.auth.getClaims();
  const supabaseResponse = getResponse();

  // The login page stays public, otherwise unauthenticated visitors would be
  // redirected to themselves in a loop.
  if (loginPath.test(pathname)) {
    return supabaseResponse;
  }

  const claims = data?.claims;

  if (error || !claims) {
    return redirectToLogin(request, supabaseResponse, {
      next: `${pathname}${search}`,
    });
  }

  const role: unknown = claims.app_metadata?.role;

  if (role !== "broker") {
    return redirectToLogin(request, supabaseResponse, { notBroker: true });
  }

  return supabaseResponse;
}

/**
 * The proxy refreshes Supabase sessions and performs an optimistic broker
 * check for admin routes. Page-level and Server Action guards remain the
 * authoritative authorization boundary.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAdminPath(pathname)) {
    return handleAdminRequest(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/properties/:path*",
    "/areas/:path*",
    "/admin",
    "/admin/:path*",
  ],
};
