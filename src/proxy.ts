import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  applySupabaseResponse,
  createSupabaseProxyClient,
} from "@/lib/supabase/proxy";
import { getAreaBySlug } from "@/modules/areas/queries";
import { getPropertyBySlug } from "@/modules/properties/queries";

const propertyPath = /^\/properties\/([^/]+)\/?$/;
const areaPath = /^\/areas\/([^/]+)\/?$/;
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
 * Unknown property and area slugs must return a real 404. Because those routes
 * are partially prerendered, calling notFound() inside the page can happen
 * after the response has started streaming and keep the 200 status. Checking
 * the slug here, before rendering, keeps the status correct.
 *
 * The proxy also refreshes Supabase sessions and performs an optimistic broker
 * check for admin routes. Page-level and Server Action guards remain the
 * authoritative authorization boundary.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAdminPath(pathname)) {
    return handleAdminRequest(request);
  }

  const propertyMatch = pathname.match(propertyPath);
  const propertySlug = propertyMatch?.[1];
  if (propertySlug && !getPropertyBySlug(propertySlug)) {
    return NextResponse.rewrite(new URL("/_not-found", request.url), {
      status: 404,
    });
  }

  const areaMatch = pathname.match(areaPath);
  const areaSlug = areaMatch?.[1];
  if (areaSlug && !getAreaBySlug(areaSlug)) {
    return NextResponse.rewrite(new URL("/_not-found", request.url), {
      status: 404,
    });
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
