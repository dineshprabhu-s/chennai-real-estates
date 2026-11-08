import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { getBrokerIdentity } from "@/lib/auth/broker";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Admin pages read the Supabase session on every request, so the segment is
 * allowed to block instead of prerendering a static shell. Authorization is
 * still enforced independently in each protected page.
 */
export const instant = false;

export default async function AdminDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const broker = await getBrokerIdentity();

  return <AdminShell brokerEmail={broker?.email ?? null}>{children}</AdminShell>;
}
