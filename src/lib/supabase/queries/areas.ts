import "server-only";

import type { PublicAreaRow } from "@/lib/supabase/database.types";
import { mapPublicArea } from "@/lib/supabase/mappers/area";
import { createPublicSupabaseClient } from "@/lib/supabase/public-server";
import type { Area } from "@/types/area";

const columns = "slug,name,pincode,summary,description,highlights,parent_area,is_active";

function publicQuery() {
  return createPublicSupabaseClient().from("areas").select(columns).eq("is_active", true);
}

/** Slug order is stable but differs from the demo's curated area order. */
export async function getPublicAreas(): Promise<Area[]> {
  const { data, error } = await publicQuery().order("slug", { ascending: true });
  if (error) throw new Error("Failed to fetch public areas");
  return (data as unknown as PublicAreaRow[]).map(mapPublicArea);
}

export async function getPublicAreaBySlug(slug: string): Promise<Area | null> {
  if (typeof slug !== "string" || !slug.trim()) throw new TypeError("slug must not be empty");
  const { data, error } = await publicQuery().eq("slug", slug.trim()).maybeSingle();
  if (error) throw new Error("Failed to fetch public area by slug");
  return data === null ? null : mapPublicArea(data as unknown as PublicAreaRow);
}
