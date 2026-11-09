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
import type { LeadStatus } from "@/types/lead";

const leadColumns =
  "id,name,phone,email,message,property_id,status,created_at,source,is_demo,updated_at";
const noteColumns = "id,lead_id,body,created_at";
const activityColumns = "id,lead_id,occurred_at,label,detail";
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
const maxPages = 40;

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

/**
 * Reads every child row for the supplied leads in stable pages. Supabase caps
 * a single response, so a single unbounded select could silently drop notes or
 * activities. Exceeding the explicit window is an error, not a partial read.
 */
async function readLeadChildren<Row extends { lead_id: string }>(
  supabase: SupabaseClient,
  table: "lead_notes" | "lead_activities",
  columns: string,
  leadIds: string[],
  timestampColumn: "created_at" | "occurred_at",
  label: string,
): Promise<Row[]> {
  if (leadIds.length === 0) return [];

  const rows: Row[] = [];

  for (let page = 0; page < maxPages; page += 1) {
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

  throw new Error(`Broker lead ${label} exceeded the safe read window`);
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

  for (let page = 0; page < maxPages; page += 1) {
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

  throw new Error("Broker property options exceeded the safe read window");
}
