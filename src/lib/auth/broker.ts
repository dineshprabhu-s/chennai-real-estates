import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Minimal broker identity that is safe to pass to UI components. */
export interface BrokerIdentity {
  id: string;
  email: string | null;
}

type BrokerSession =
  | { status: "broker"; broker: BrokerIdentity }
  | { status: "unauthenticated" }
  | { status: "forbidden" };

/**
 * Reads server-verified JWT claims for the current request.
 *
 * `getClaims()` is used instead of `getSession()` so the token is validated by
 * Supabase before its `app_metadata.role` is trusted. React `cache` keeps the
 * lookup to once per render pass.
 */
const getBrokerSession = cache(async (): Promise<BrokerSession> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return { status: "unauthenticated" };
  }

  const role: unknown = data.claims.app_metadata?.role;

  if (role !== "broker") {
    return { status: "forbidden" };
  }

  return {
    status: "broker",
    broker: {
      id: data.claims.sub,
      email: data.claims.email ?? null,
    },
  };
});

/**
 * Returns the sanitized broker identity for the current request, or `null`
 * when the visitor is not an authenticated broker.
 *
 * Prefer `requireBroker()` on admin pages and Server Actions so unauthorized
 * visits are redirected instead of silently rendering nothing.
 */
export async function getBrokerIdentity(): Promise<BrokerIdentity | null> {
  const session = await getBrokerSession();
  return session.status === "broker" ? session.broker : null;
}

/**
 * Authorization guard for admin pages and Server Actions.
 *
 * Redirects unauthenticated visitors to the login page and authenticated
 * non-brokers to the login page with an authorization error. Only the
 * server-controlled `app_metadata.role` is trusted; `user_metadata` is never
 * consulted.
 */
export async function requireBroker(): Promise<BrokerIdentity> {
  const session = await getBrokerSession();

  if (session.status === "unauthenticated") {
    redirect("/admin/login");
  }

  if (session.status === "forbidden") {
    redirect("/admin/login?error=not-broker");
  }

  return session.broker;
}
