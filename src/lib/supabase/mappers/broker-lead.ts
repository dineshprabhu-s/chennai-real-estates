import "server-only";

import type {
  BrokerLead,
  BrokerLeadActivityRow,
  BrokerLeadNote,
  BrokerLeadNoteRow,
  BrokerLeadRow,
  BrokerPropertyOption,
  BrokerPropertyRow,
} from "@/lib/supabase/broker.types";
import type { LeadActivity } from "@/types/lead";

function byTimestamp<T>(value: (row: T) => string) {
  return (a: T, b: T): number => {
    const left = value(a);
    const right = value(b);

    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  };
}

/** The schema has no note author, so the mapper never invents one. */
export function mapBrokerLeadNote(row: BrokerLeadNoteRow): BrokerLeadNote {
  return {
    id: String(row.id),
    body: row.body,
    createdAt: row.created_at,
  };
}

export function mapBrokerLeadActivity(
  row: BrokerLeadActivityRow,
): LeadActivity {
  return {
    id: row.id,
    at: row.occurred_at,
    label: row.label,
    detail: row.detail ?? undefined,
  };
}

/**
 * Maps a lead row plus its children into the broker inbox model.
 *
 * Notes and activities are ordered oldest-first regardless of the order the
 * caller supplied, matching the existing timeline UI.
 */
export function mapBrokerLead(
  row: BrokerLeadRow,
  noteRows: BrokerLeadNoteRow[] = [],
  activityRows: BrokerLeadActivityRow[] = [],
): BrokerLead {
  const customer = row.customers;

  return {
    id: row.id,
    customerId: row.customer_id,
    // Contact details follow the current customer record so broker edits are
    // reflected in every enquiry. The enquiry message itself stays historical.
    name: customer?.name ?? row.name,
    phone: customer?.phone ?? row.phone,
    email: customer?.email ?? row.email,
    message: row.message,
    propertyId: row.property_id,
    status: row.status,
    createdAt: row.created_at,
    source: row.source,
    isDemo: row.is_demo,
    updatedAt: row.updated_at,
    notes: [...noteRows]
      .sort(byTimestamp((note) => note.created_at))
      .map(mapBrokerLeadNote),
    activities: [...activityRows]
      .sort(byTimestamp((activity) => activity.occurred_at))
      .map(mapBrokerLeadActivity),
  };
}

export function mapBrokerPropertyOption(
  row: Pick<BrokerPropertyRow, "id" | "title" | "locality" | "status">,
): BrokerPropertyOption {
  return {
    id: row.id,
    title: row.title,
    locality: row.locality,
    status: row.status,
  };
}
