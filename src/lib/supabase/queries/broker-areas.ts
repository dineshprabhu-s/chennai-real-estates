import "server-only";

import { requireBroker } from "@/lib/auth/broker";
import type { BrokerAreaOption } from "@/lib/supabase/broker.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Includes inactive areas so an existing property can retain its relationship. */
export async function getBrokerAreas(): Promise<BrokerAreaOption[]> {
  await requireBroker();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("areas").select("slug,name,is_active").order("slug", { ascending: true });
  if (error) throw new Error("Failed to fetch broker areas");
  return (data as unknown as Array<{ slug: string; name: string; is_active: boolean }>).map((area) => ({
    slug: area.slug, name: area.name, isActive: area.is_active,
  }));
}
