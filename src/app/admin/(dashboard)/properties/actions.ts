"use server";

import { revalidatePath } from "next/cache";
import { requireBroker } from "@/lib/auth/broker";
import type { BrokerPropertyRow } from "@/lib/supabase/broker.types";
import { mapBrokerProperty } from "@/lib/supabase/mappers/broker-property";
import { mapBrokerPropertyCreate, mapBrokerPropertyUpdate } from "@/lib/supabase/mappers/broker-property-write";
import { getBrokerAreas } from "@/lib/supabase/queries/broker-areas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateBrokerPropertyInput } from "@/lib/supabase/validation/broker-property-input";
import { propertyStatusOptions } from "@/modules/properties/constants";

// This is a broker-only projection. Never return the row to an action caller.
const columns = "id,slug,title,summary,description,public_description,type,configuration,listing_type,status,price,price_negotiable,bedrooms,bathrooms,built_up_area_sqft,carpet_area_sqft,uds_sqft,floor,facing,building_age_years,has_lift,parking,furnishing,approval_status,brokerage,brokerage_type,brokerage_value,availability_note,landmark,address,total_floors,security_deposit,last_verified_at,area_slug,locality,features,is_featured,verification_status,whatsapp_reference,listed_at,updated_at";

type ActionResult =
  | { ok: true; id: string; changed: boolean; warning?: string }
  | { ok: false; kind: "validation" | "not-found" | "conflict" | "database"; message: string; fields?: Record<string, string> };

function databaseError(error: { code?: string } | null): ActionResult {
  switch (error?.code) {
    case "23505":
      return { ok: false, kind: "conflict", message: "A property with this identifier or URL already exists. Please try another URL." };
    case "23503":
      return { ok: false, kind: "validation", message: "The selected area is no longer available.", fields: { areaSlug: "Choose an available area." } };
    case "23514": case "23502": case "22P02": case "22003": case "22007": case "22008":
      return { ok: false, kind: "validation", message: "The property details are invalid. Review the fields and try again." };
    default:
      return { ok: false, kind: "database", message: "Unable to save the property. Please try again." };
  }
}

/** Change availability without modifying approval or other property details. */
export async function updateBrokerPropertyStatus(id: unknown, status: unknown): Promise<ActionResult> {
  await requireBroker();
  if (typeof id !== "string" || !id.trim() || id !== id.trim() || id.length > 200 || /[\/\\?#]/.test(id)) {
    return { ok: false, kind: "validation", message: "Enter a valid property ID." };
  }
  if (typeof status !== "string" || !propertyStatusOptions.some((option) => option.value === status)) {
    return { ok: false, kind: "validation", message: "Choose a valid property status." };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const projection = "id,slug,area_slug,status";
    const { data: existing, error: readError } = await supabase.from("properties").select(projection).eq("id", id).maybeSingle();
    if (readError) return databaseError(readError);
    if (existing === null) return { ok: false, kind: "not-found", message: "Property not found." };
    if (existing.status === status) return { ok: true, id, changed: false };
    const { data: updated, error } = await supabase.from("properties").update({ status }).eq("id", id).select(projection).maybeSingle();
    if (error) return databaseError(error);
    if (updated === null) return { ok: false, kind: "not-found", message: "Property not found." };
    const refreshed = refreshPaths(id, updated.slug, updated.area_slug, { slug: existing.slug, area: existing.area_slug });
    return { ok: true, id, changed: true, ...(!refreshed ? { warning: "Saved, but some pages could not be refreshed." } : {}) };
  } catch {
    return databaseError(null);
  }
}

function refreshPaths(id: string, slug: string, area: string, previous?: { slug: string; area: string }): boolean {
  const paths = new Set([
    "/", "/properties", "/areas", "/admin/properties", "/admin/dashboard", "/admin/areas",
    `/admin/properties/${encodeURIComponent(id)}/edit`,
    `/properties/${encodeURIComponent(slug)}`, `/areas/${encodeURIComponent(area)}`,
  ]);
  if (previous) {
    paths.add(`/properties/${encodeURIComponent(previous.slug)}`);
    paths.add(`/areas/${encodeURIComponent(previous.area)}`);
  }
  let success = true;
  for (const path of paths) {
    try { revalidatePath(path); } catch { success = false; }
  }
  return success;
}

/** The authentication redirect intentionally propagates before any data access. */
export async function createBrokerProperty(input: unknown, intent: unknown): Promise<ActionResult> {
  await requireBroker();
  try {
    const supabase = await createSupabaseServerClient();
    const areas = await getBrokerAreas();
    const validated = validateBrokerPropertyInput(input, intent, { operation: "create", areas });
    if (!validated.ok) return { ok: false, kind: "validation", message: "Review the property details.", fields: validated.errors };
    let slugConflict = false;
    const insert = await mapBrokerPropertyCreate(validated, async (slug) => {
      const { data, error } = await supabase.from("properties").select("id").eq("slug", slug).maybeSingle();
      if (error) throw new Error("Slug lookup failed");
      slugConflict = data !== null;
      return !slugConflict;
    }).catch(() => null);
    if (!insert) return slugConflict ? databaseError({ code: "23505" }) : databaseError(null);
    const { data, error } = await supabase.from("properties").insert(insert).select(columns).single();
    if (error) return databaseError(error);
    const row = data as unknown as BrokerPropertyRow;
    // A write has already succeeded; never report it as failed or prompt a retry
    // merely because mapping or cache refresh fails afterwards.
    let warning: string | undefined;
    try { mapBrokerProperty(row); } catch { warning = "Saved, but some property details could not be verified."; }
    if (!refreshPaths(row.id, row.slug, row.area_slug)) warning = "Saved, but some pages could not be refreshed.";
    return { ok: true, id: row.id, changed: true, ...(warning ? { warning } : {}) };
  } catch {
    return databaseError(null);
  }
}

/** input contains only intentional changes; omitted fields remain untouched. */
export async function updateBrokerProperty(id: unknown, input: unknown, intent: unknown): Promise<ActionResult> {
  await requireBroker();
  if (typeof id !== "string" || !id.trim() || id !== id.trim() || id.length > 200 || /[\/\\?#]/.test(id)) {
    return { ok: false, kind: "validation", message: "Enter a valid property ID.", fields: { id: "Enter a valid property ID." } };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data: found, error: readError } = await supabase.from("properties").select(columns).eq("id", id).maybeSingle();
    if (readError) return databaseError(readError);
    if (found === null) return { ok: false, kind: "not-found", message: "Property not found." };
    const existing = found as unknown as BrokerPropertyRow;
    const areas = await getBrokerAreas();
    const validated = validateBrokerPropertyInput(input, intent, { operation: "update", areas, existing });
    if (!validated.ok) return { ok: false, kind: "validation", message: "Review the property details.", fields: validated.errors };
    const update = mapBrokerPropertyUpdate(validated);
    if (update.status === existing.status) delete update.status;
    if (Object.keys(update).length === 0) return { ok: true, id, changed: false };
    const { data, error } = await supabase.from("properties").update(update).eq("id", id).select(columns).maybeSingle();
    if (error) return databaseError(error);
    if (data === null) return { ok: false, kind: "not-found", message: "Property not found." };
    const row = data as unknown as BrokerPropertyRow;
    let warning: string | undefined;
    try { mapBrokerProperty(row); } catch { warning = "Saved, but some property details could not be verified."; }
    if (!refreshPaths(row.id, row.slug, row.area_slug, { slug: existing.slug, area: existing.area_slug })) warning = "Saved, but some pages could not be refreshed.";
    return { ok: true, id: row.id, changed: true, ...(warning ? { warning } : {}) };
  } catch {
    return databaseError(null);
  }
}
