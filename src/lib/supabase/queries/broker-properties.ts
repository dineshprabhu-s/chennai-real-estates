import "server-only";

import { requireBroker } from "@/lib/auth/broker";
import type { BrokerProperty, BrokerPropertyRow } from "@/lib/supabase/broker.types";
import { mapBrokerProperty } from "@/lib/supabase/mappers/broker-property";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const columns = "id,slug,title,summary,description,public_description,type,configuration,listing_type,status,price,price_negotiable,bedrooms,bathrooms,built_up_area_sqft,carpet_area_sqft,uds_sqft,floor,facing,building_age_years,has_lift,parking,furnishing,approval_status,brokerage,brokerage_type,brokerage_value,availability_note,landmark,address,total_floors,security_deposit,last_verified_at,area_slug,locality,features,is_featured,verification_status,whatsapp_reference,listed_at,updated_at";

function requireValue(value: string, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${name} must not be empty`);
  return value.trim();
}

/** Private results must stay server-side and must not be cached across users. */
export async function getBrokerProperties(): Promise<BrokerProperty[]> {
  await requireBroker();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("properties").select(columns).order("id", { ascending: true });
  if (error) throw new Error("Failed to fetch broker properties");
  return (data as unknown as BrokerPropertyRow[]).map(mapBrokerProperty);
}

export async function getBrokerPropertyById(id: string): Promise<BrokerProperty | null> {
  await requireBroker();
  const validId = requireValue(id, "id");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("properties").select(columns).eq("id", validId).maybeSingle();
  if (error) throw new Error("Failed to fetch broker property by ID");
  return data === null ? null : mapBrokerProperty(data as unknown as BrokerPropertyRow);
}

export async function getBrokerPropertyBySlug(slug: string): Promise<BrokerProperty | null> {
  await requireBroker();
  const validSlug = requireValue(slug, "slug");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("properties").select(columns).eq("slug", validSlug).maybeSingle();
  if (error) throw new Error("Failed to fetch broker property by slug");
  return data === null ? null : mapBrokerProperty(data as unknown as BrokerPropertyRow);
}
