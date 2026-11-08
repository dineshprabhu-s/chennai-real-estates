import "server-only";

import type { PublicPropertyRow } from "@/lib/supabase/database.types";
import { mapPublicProperty } from "@/lib/supabase/mappers/property";
import { createPublicSupabaseClient } from "@/lib/supabase/public-server";
import type { Property } from "@/types/property";

const columns = "id,slug,title,summary,public_description,type,configuration,listing_type,status,price,price_negotiable,bedrooms,bathrooms,built_up_area_sqft,carpet_area_sqft,uds_sqft,floor,facing,building_age_years,has_lift,parking,furnishing,approval_status,brokerage,brokerage_type,brokerage_value,availability_note,landmark,total_floors,security_deposit,last_verified_at,area_slug,locality,features,is_featured,verification_status,listed_at,updated_at";
const publicStatuses = ["available", "under-offer"];

function requireValue(value: string, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${name} must not be empty`);
  return value.trim();
}

function publicQuery() {
  return createPublicSupabaseClient().from("properties").select(columns).in("status", publicStatuses);
}

// IDs preserve the seed's existing property and featured ordering. Database
// rows have no insertion order; ID is a stable, unique ordering key.
export async function getPublicProperties(): Promise<Property[]> {
  const { data, error } = await publicQuery().order("id", { ascending: true });
  if (error) throw new Error("Failed to fetch public properties");
  return (data as unknown as PublicPropertyRow[]).map(mapPublicProperty);
}

export async function getPublicPropertyBySlug(slug: string): Promise<Property | null> {
  const { data, error } = await publicQuery().eq("slug", requireValue(slug, "slug")).maybeSingle();
  if (error) throw new Error("Failed to fetch public property by slug");
  return data === null ? null : mapPublicProperty(data as unknown as PublicPropertyRow);
}

export async function getPublicPropertyById(id: string): Promise<Property | null> {
  const { data, error } = await publicQuery().eq("id", requireValue(id, "id")).maybeSingle();
  if (error) throw new Error("Failed to fetch public property by ID");
  return data === null ? null : mapPublicProperty(data as unknown as PublicPropertyRow);
}

export async function getFeaturedProperties(limit = 3): Promise<Property[]> {
  if (!Number.isSafeInteger(limit) || limit < 0) throw new RangeError("limit must be a non-negative safe integer");
  if (limit === 0) return [];
  const { data, error } = await publicQuery().eq("is_featured", true).order("id", { ascending: true }).limit(limit);
  if (error) throw new Error("Failed to fetch featured properties");
  return (data as unknown as PublicPropertyRow[]).map(mapPublicProperty);
}

export async function getPublicPropertiesByArea(areaSlug: string): Promise<Property[]> {
  const { data, error } = await publicQuery().eq("area_slug", requireValue(areaSlug, "areaSlug")).order("id", { ascending: true });
  if (error) throw new Error("Failed to fetch public properties by area");
  return (data as unknown as PublicPropertyRow[]).map(mapPublicProperty);
}
