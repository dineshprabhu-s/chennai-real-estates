import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getAreaBySlug } from "@/modules/areas/queries";
import { getPropertyBySlug } from "@/modules/properties/queries";

const propertyPath = /^\/properties\/([^/]+)\/?$/;
const areaPath = /^\/areas\/([^/]+)\/?$/;

/**
 * Unknown property and area slugs must return a real 404. Because those routes
 * are partially prerendered, calling notFound() inside the page can happen
 * after the response has started streaming and keep the 200 status. Checking
 * the slug here, before rendering, keeps the status correct.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ["/properties/:path*", "/areas/:path*"],
};
