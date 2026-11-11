import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Notice } from "@/components/common/notice";
import { requireBroker } from "@/lib/auth/broker";
import {
  getBrokerCustomerPage,
  getBrokerCustomerStats,
} from "@/lib/supabase/queries/broker-customers";

import { AdminCustomersClient } from "./admin-customers-client";

export const metadata: Metadata = {
  title: "Customers",
};

// Session-guarded admin pages are allowed to block during navigation.
export const instant = false;

/**
 * Server wrapper for the customer directory. Customer identity is based on the
 * normalized phone number; linked enquiries remain independently managed.
 */
export default async function AdminCustomersPage() {
  await requireBroker();

  const [initialPage, stats] = await Promise.all([
    getBrokerCustomerPage({ page: 1, query: "", sort: "recent-enquiry" }),
    getBrokerCustomerStats(),
  ]);

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[{ label: "Customers" }]}
        eyebrow="Customers"
        title="Customer directory"
        description="One customer record can hold several independently managed enquiries. Customers are matched by phone number, and editing a customer never merges another history."
      />

      <Notice className="mt-6">
        Customer records are matched by normalized phone number. Each enquiry
        keeps its own property, message, status, notes and activity timeline.
        Customers derived only from seeded demo enquiries remain read-only.
      </Notice>

      <AdminCustomersClient initialPage={initialPage} stats={stats} />
    </div>
  );
}
