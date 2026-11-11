import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { requireBroker } from "@/lib/auth/broker";
import type {
  BrokerLead,
  BrokerLeadActivityRow,
  BrokerLeadInbox,
  BrokerLeadNoteRow,
  BrokerLeadRow,
  BrokerLeadStats,
  BrokerPropertyOption,
  BrokerPropertyRow,
} from "@/lib/supabase/broker.types";
import {
  mapBrokerLead,
  mapBrokerPropertyOption,
} from "@/lib/supabase/mappers/broker-lead";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { leadStatusOptions } from "@/modules/leads/constants";
import type { LeadStatus, LeadSource } from "@/types/lead";

export const leadColumns =
  "id,name,phone,email,message,property_id,customer_id,customers(name,phone,email),status,created_at,source,is_demo,updated_at";
export const noteColumns = "id,lead_id,body,created_at";
export const activityColumns = "id,lead_id,occurred_at,label,detail";
const propertyOptionColumns = "id,title,locality,status";

/**
 * The inbox is a bounded window rather than an unbounded select. The old demo
 * inbox only had seven rows; PostgREST would silently cap a real unbounded
 * select, so the page is told the full count and whether the window is
 * incomplete.
 */
export const BROKER_LEADS_LIMIT = 100;

const childPageSize = 500;
const propertyPageSize = 500;

function requireLeadId(id: string): string {
  if (typeof id !== "string" || !id.trim() || id.trim().length > 64) {
    throw new TypeError("id must be a non-empty lead identifier");
  }

  return id.trim();
}

function groupByLead<Row extends { lead_id: string }>(
  rows: Row[],
): Map<string, Row[]> {
  const grouped = new Map<string, Row[]>();

  for (const row of rows) {
    const existing = grouped.get(row.lead_id);
    if (existing) existing.push(row);
    else grouped.set(row.lead_id, [row]);
  }

  return grouped;
}

export { groupByLead };

/**
 * Reads every child row for the supplied leads in stable pages. Supabase caps
 * a single response, so a single unbounded select could silently drop notes or
 * activities. Reads continue until the final page, so long histories are not silently truncated.
 */
export async function readLeadChildren<Row extends { lead_id: string }>(
  supabase: SupabaseClient,
  table: "lead_notes" | "lead_activities",
  columns: string,
  leadIds: string[],
  timestampColumn: "created_at" | "occurred_at",
  label: string,
): Promise<Row[]> {
  if (leadIds.length === 0) return [];

  const rows: Row[] = [];

  for (let page = 0; ; page += 1) {
    const start = page * childPageSize;
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .in("lead_id", leadIds)
      .order("lead_id", { ascending: true })
      .order(timestampColumn, { ascending: true })
      .order("id", { ascending: true })
      .range(start, start + childPageSize - 1);

    if (error) throw new Error(`Failed to fetch broker lead ${label}`);

    const batch = (data ?? []) as unknown as Row[];
    rows.push(...batch);

    if (batch.length < childPageSize) return rows;
  }

}

/** Broker inbox list. Customer data must never be cached across requests. */
export async function getBrokerLeads(): Promise<BrokerLeadInbox> {
  await requireBroker();

  const supabase = await createSupabaseServerClient();
  const { data, error, count } = await supabase
    .from("leads")
    .select(leadColumns, { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(BROKER_LEADS_LIMIT);

  if (error) throw new Error("Failed to fetch broker leads");
  if (typeof count !== "number") throw new Error("Failed to count broker leads");

  const rows = (data ?? []) as unknown as BrokerLeadRow[];
  const leadIds = rows.map((row) => row.id);
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
  const leads = rows.map((row) =>
    mapBrokerLead(
      row,
      notesByLead.get(row.id) ?? [],
      activitiesByLead.get(row.id) ?? [],
    ),
  );

  return {
    leads,
    total: count,
    limit: BROKER_LEADS_LIMIT,
    hasMore: count > rows.length,
  };
}

export interface BrokerLeadPageFilters {
  page: number;
  query: string;
  status: LeadStatus | "all";
  source: LeadSource | "all";
  propertyId: string;
}
export interface BrokerLeadPage {
  leads: BrokerLead[];
  page: number;
  pageSize: number;
  matchingTotal: number;
  total: number;
}
export const BROKER_LEAD_PAGE_SIZE = 25;

/** Exact counts and a bounded page are evaluated by PostgREST under broker RLS. */
export async function getBrokerLeadPage(filters: BrokerLeadPageFilters): Promise<BrokerLeadPage> {
  await requireBroker();
  const supabase = await createSupabaseServerClient();
  const page = Number.isSafeInteger(filters.page) && filters.page > 0 ? filters.page : 1;
  const offset = (page - 1) * BROKER_LEAD_PAGE_SIZE;
  if (!Number.isSafeInteger(offset)) throw new Error("Invalid lead page");
  const keyword = filters.query.trim().slice(0, 100);
  const statuses = leadStatusOptions.map((option) => option.value);
  const sources: LeadSource[] = ["website-form", "property-enquiry", "whatsapp", "phone"];
  if (filters.status !== "all" && !statuses.includes(filters.status)) throw new Error("Invalid lead status");
  if (filters.source !== "all" && !sources.includes(filters.source)) throw new Error("Invalid lead source");
  if (typeof filters.propertyId !== "string" || filters.propertyId.length > 64) throw new Error("Invalid property filter");
  let query = supabase.from("leads").select(keyword ? `${leadColumns},search_property:properties!leads_property_id_fkey()` : leadColumns, { count: "exact" });
  if (filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.source !== "all") query = query.eq("source", filters.source);
  if (filters.propertyId === "general") query = query.is("property_id", null);
  else if (filters.propertyId !== "all") query = query.eq("property_id", filters.propertyId);
  if (keyword) {
    // Quote PostgREST filter operands and escape LIKE metacharacters so user
    // input cannot alter the filter grammar or turn into wildcard patterns.
    const literal = keyword.replace(/[\\%_]/g, "\\$&").replace(/"/g, '\\"');
    const pattern = `"%${literal}%"`;
    query = query.or(`title.ilike.${pattern},locality.ilike.${pattern}`, { referencedTable: "search_property" });
    query = query.or([...["id", "name", "phone", "email", "customer_id", "property_id", "message", "customers.name", "customers.phone", "customers.email"].map((field) => `${field}.ilike.${pattern}`), "search_property.not.is.null"].join(","));
  }
  const [result, totalResult] = await Promise.all([
    query.order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + BROKER_LEAD_PAGE_SIZE - 1),
    supabase.from("leads").select("id", { count: "exact", head: true }),
  ]);
  if (result.error || typeof result.count !== "number" || !result.data) throw new Error("Failed to fetch broker lead page");
  if (totalResult.error || typeof totalResult.count !== "number") throw new Error("Failed to count broker leads");
  const rows = result.data as unknown as BrokerLeadRow[];
  const ids = rows.map((row) => row.id);
  const [notes, activities] = await Promise.all([
    readLeadChildren<BrokerLeadNoteRow>(supabase, "lead_notes", noteColumns, ids, "created_at", "notes"),
    readLeadChildren<BrokerLeadActivityRow>(supabase, "lead_activities", activityColumns, ids, "occurred_at", "activities"),
  ]);
  const notesByLead = groupByLead(notes), activitiesByLead = groupByLead(activities);
  return { leads: rows.map((row) => mapBrokerLead(row, notesByLead.get(row.id) ?? [], activitiesByLead.get(row.id) ?? [])), page, pageSize: BROKER_LEAD_PAGE_SIZE, matchingTotal: result.count, total: totalResult.count };
}

/** One lead with notes and activities. Returns null only for a missing row. */
export async function getBrokerLeadById(
  id: string,
): Promise<BrokerLead | null> {
  await requireBroker();

  const validId = requireLeadId(id);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("leads")
    .select(leadColumns)
    .eq("id", validId)
    .maybeSingle();

  if (error) throw new Error("Failed to fetch broker lead by ID");
  if (data === null) return null;

  const row = data as unknown as BrokerLeadRow;
  const [noteRows, activityRows] = await Promise.all([
    readLeadChildren<BrokerLeadNoteRow>(
      supabase,
      "lead_notes",
      noteColumns,
      [row.id],
      "created_at",
      "notes",
    ),
    readLeadChildren<BrokerLeadActivityRow>(
      supabase,
      "lead_activities",
      activityColumns,
      [row.id],
      "occurred_at",
      "activities",
    ),
  ]);

  return mapBrokerLead(row, noteRows, activityRows);
}

/**
 * Counts come from head-only count queries, not from loading every lead. The
 * status list mirrors the database enum through the existing UI constants.
 */
export async function getBrokerLeadStats(): Promise<BrokerLeadStats> {
  await requireBroker();

  const supabase = await createSupabaseServerClient();
  const statuses: LeadStatus[] = leadStatusOptions.map((option) => option.value);

  async function countLeads(status?: LeadStatus): Promise<number> {
    const base = supabase
      .from("leads")
      .select("id", { count: "exact", head: true });
    const query = status ? base.eq("status", status) : base;
    const { count, error } = await query;

    if (error) throw new Error("Failed to count broker leads");
    if (typeof count !== "number") throw new Error("Failed to count broker leads");

    return count;
  }

  const [total, ...statusCounts] = await Promise.all([
    countLeads(),
    ...statuses.map((status) => countLeads(status)),
  ]);

  const counts = Object.fromEntries(
    statuses.map((status, index) => [status, statusCounts[index] ?? 0]),
  ) as Record<LeadStatus, number>;

  return {
    ...counts,
    total,
    pending: counts.new + counts.contacted + counts["visit-scheduled"],
    scheduledVisits: counts["visit-scheduled"],
  };
}

/** Bounded recent list for the dashboard. It intentionally omits children. */
export async function getRecentBrokerLeads(limit = 5): Promise<BrokerLead[]> {
  await requireBroker();

  const safeLimit = Number.isFinite(limit)
    ? Math.min(Math.max(0, Math.trunc(limit)), 20)
    : 5;

  if (safeLimit === 0) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("leads")
    .select(leadColumns)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(safeLimit);

  if (error) throw new Error("Failed to fetch recent broker leads");

  return ((data ?? []) as unknown as BrokerLeadRow[]).map((row) =>
    mapBrokerLead(row),
  );
}

/**
 * Property options use broker-side reads so leads keep resolving against
 * sold, draft, unavailable, and expired properties. Only display fields leave
 * this function; private property columns are never selected.
 */
export async function getBrokerPropertyOptions(): Promise<
  BrokerPropertyOption[]
> {
  await requireBroker();

  const supabase = await createSupabaseServerClient();
  const rows: Array<
    Pick<BrokerPropertyRow, "id" | "title" | "locality" | "status">
  > = [];

  for (let page = 0; ; page += 1) {
    const start = page * propertyPageSize;
    const { data, error } = await supabase
      .from("properties")
      .select(propertyOptionColumns)
      .order("id", { ascending: true })
      .range(start, start + propertyPageSize - 1);

    if (error) throw new Error("Failed to fetch broker property options");

    const batch = (data ?? []) as unknown as Array<
      Pick<BrokerPropertyRow, "id" | "title" | "locality" | "status">
    >;
    rows.push(...batch);

    if (batch.length < propertyPageSize) return rows.map(mapBrokerPropertyOption);
  }

}
