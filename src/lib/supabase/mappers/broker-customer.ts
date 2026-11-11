import "server-only";

import type {
  BrokerCustomer,
  BrokerCustomerSummaryRow,
} from "@/lib/supabase/broker.types";

/**
 * PostgREST returns Postgres `bigint` aggregates as numbers or strings, so the
 * mapper coerces defensively without inventing a count from missing data.
 */
function asCount(value: number | string): number {
  const parsed = typeof value === "string" ? Number(value) : value;

  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

export function mapBrokerCustomer(
  row: BrokerCustomerSummaryRow,
): BrokerCustomer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    normalizedPhone: row.normalized_phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    enquiryCount: asCount(row.enquiry_count),
    activeEnquiryCount: asCount(row.active_enquiry_count),
    latestEnquiryAt: row.latest_enquiry_at,
    latestActivityLabel: row.latest_activity_label,
    latestActivityAt: row.latest_activity_at,
    isDemo: row.is_demo,
  };
}
