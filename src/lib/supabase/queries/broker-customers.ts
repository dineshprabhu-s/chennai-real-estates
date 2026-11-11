import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { requireBroker } from "@/lib/auth/broker";
import type {
  BrokerCustomerDetail,
  BrokerCustomerPage,
  BrokerCustomerPageFilters,
  BrokerCustomerStats,
  BrokerCustomerSummaryRow,
  BrokerLeadActivityRow,
  BrokerLeadNoteRow,
  BrokerLeadRow,
} from "@/lib/supabase/broker.types";
import { mapBrokerCustomer } from "@/lib/supabase/mappers/broker-customer";
import { mapBrokerLead } from "@/lib/supabase/mappers/broker-lead";
import {
  activityColumns,
  groupByLead,
  leadColumns,
  noteColumns,
  readLeadChildren,
} from "@/lib/supabase/queries/broker-leads";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { brokerCustomerSortOptions } from "@/modules/customers/constants";

export const BROKER_CUSTOMER_PAGE_SIZE = 25;
const customerLeadPageSize = 500;

const customerColumns =
  "id,name,phone,email,normalized_phone,created_at,updated_at,enquiry_count,active_enquiry_count,latest_enquiry_at,is_demo,latest_activity_label,latest_activity_at";

const customerIdPattern = /^CUST-[0-9]+$/;

function requireCustomerId(id: string): string {
  if (typeof id !== "string" || !customerIdPattern.test(id)) {
    throw new TypeError("id must be a customer identifier");
  }

  return id;
}

/** Quote PostgREST operands and escape LIKE metacharacters. */
function searchPattern(keyword: string): string {
  const literal = keyword.replace(/[\\%_]/g, "\\$&").replace(/"/g, '\\"');

  return `"%${literal}%"`;
}

function validPage(page: number): number {
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

/**
 * Server-side customer listing. Search, sorting and pagination are evaluated
 * by PostgREST under broker RLS; no customer rows are loaded just to filter.
 */
export async function getBrokerCustomerPage(
  filters: BrokerCustomerPageFilters,
): Promise<BrokerCustomerPage> {
  await requireBroker();

  const sortOptions = brokerCustomerSortOptions.map((option) => option.value);
  if (!sortOptions.includes(filters.sort)) throw new Error("Invalid customer sort");
  if (typeof filters.query !== "string") throw new Error("Invalid customer search");

  const page = validPage(filters.page);
  const offset = (page - 1) * BROKER_CUSTOMER_PAGE_SIZE;
  if (!Number.isSafeInteger(offset)) throw new Error("Invalid customer page");

  const supabase = await createSupabaseServerClient();
  const keyword = filters.query.trim().slice(0, 100);

  let query = supabase
    .from("broker_customer_summary")
    .select(customerColumns, { count: "exact" });

  if (keyword) {
    const pattern = searchPattern(keyword);
    query = query.or(
      ["id", "name", "phone", "email", "normalized_phone"]
        .map((field) => `${field}.ilike.${pattern}`)
        .join(","),
    );
  }

  // PostgREST orders null timestamps last so customers without an activity are
  // not placed ahead of customers with a real one.
  switch (filters.sort) {
    case "recent-activity":
      query = query
        .order("latest_activity_at", { ascending: false, nullsFirst: false })
        .order("latest_enquiry_at", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false });
      break;
    case "name":
      query = query
        .order("name", { ascending: true })
        .order("id", { ascending: true });
      break;
    case "newest":
      query = query
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
      break;
    default:
      query = query
        .order("latest_enquiry_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
  }

  const [result, totalResult] = await Promise.all([
    query.range(offset, offset + BROKER_CUSTOMER_PAGE_SIZE - 1),
    supabase
      .from("broker_customer_summary")
      .select("id", { count: "exact", head: true }),
  ]);

  if (result.error || typeof result.count !== "number" || !result.data) {
    throw new Error("Failed to fetch broker customer page");
  }
  if (totalResult.error || typeof totalResult.count !== "number") {
    throw new Error("Failed to count broker customers");
  }

  return {
    customers: (result.data as unknown as BrokerCustomerSummaryRow[]).map(
      mapBrokerCustomer,
    ),
    page,
    pageSize: BROKER_CUSTOMER_PAGE_SIZE,
    matchingTotal: result.count,
    total: totalResult.count,
  };
}

async function readCustomerLeadRows(
  supabase: SupabaseClient,
  customerId: string,
): Promise<BrokerLeadRow[]> {
  const rows: BrokerLeadRow[] = [];

  for (let page = 0; ; page += 1) {
    const start = page * customerLeadPageSize;
    const { data, error } = await supabase
      .from("leads")
      .select(leadColumns)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(start, start + customerLeadPageSize - 1);

    if (error) throw new Error("Failed to fetch customer enquiries");

    const batch = (data ?? []) as unknown as BrokerLeadRow[];
    rows.push(...batch);

    if (batch.length < customerLeadPageSize) return rows;
  }
}

/**
 * One customer with the complete linked enquiry history. Enquiry rows keep
 * their own message, status, notes and activity timeline.
 */
export async function getBrokerCustomerById(
  id: string,
): Promise<BrokerCustomerDetail | null> {
  await requireBroker();

  const customerId = requireCustomerId(id);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("broker_customer_summary")
    .select(customerColumns)
    .eq("id", customerId)
    .maybeSingle();

  if (error) throw new Error("Failed to fetch broker customer by ID");
  if (data === null) return null;

  const leadRows = await readCustomerLeadRows(supabase, customerId);
  const leadIds = leadRows.map((row) => row.id);
  const [noteRows, activityRows] = await Promise.all([
    readLeadChildren<BrokerLeadNoteRow>(
      supabase,
      "lead_notes",
      noteColumns,
      leadIds,
      "created_at",
      "notes",
    ),
    readLeadChildren<BrokerLeadActivityRow>(
      supabase,
      "lead_activities",
      activityColumns,
      leadIds,
      "occurred_at",
      "activities",
    ),
  ]);

  const notesByLead = groupByLead(noteRows);
  const activitiesByLead = groupByLead(activityRows);

  return {
    ...mapBrokerCustomer(data as unknown as BrokerCustomerSummaryRow),
    enquiries: leadRows.map((row) =>
      mapBrokerLead(
        row,
        notesByLead.get(row.id) ?? [],
        activitiesByLead.get(row.id) ?? [],
      ),
    ),
  };
}

/**
 * Head-only counts keep the customer metrics cheap and exact. Demo status is
 * derived by the view from the linked leads, not stored per customer.
 */
export async function getBrokerCustomerStats(): Promise<BrokerCustomerStats> {
  await requireBroker();

  const supabase = await createSupabaseServerClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  async function countCustomers(
    metric: "total" | "active" | "repeat" | "new",
  ): Promise<number> {
    let query = supabase
      .from("broker_customer_summary")
      .select("id", { count: "exact", head: true });

    if (metric === "active") query = query.gt("active_enquiry_count", 0);
    if (metric === "repeat") query = query.gte("enquiry_count", 2);
    if (metric === "new") query = query.gte("created_at", thirtyDaysAgo);

    const { count, error } = await query;
    if (error) throw new Error("Failed to count broker customers");
    if (typeof count !== "number") throw new Error("Failed to count broker customers");

    return count;
  }

  const [total, withActiveEnquiries, repeatCustomers, newLast30Days] =
    await Promise.all([
      countCustomers("total"),
      countCustomers("active"),
      countCustomers("repeat"),
      countCustomers("new"),
    ]);

  return { total, withActiveEnquiries, repeatCustomers, newLast30Days };
}
