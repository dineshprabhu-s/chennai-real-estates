import "server-only";
import { requireBroker } from "@/lib/auth/broker";
import type { PublicAreaRow } from "@/lib/supabase/database.types";
import { mapPublicArea } from "@/lib/supabase/mappers/area";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getBrokerAreasWithCounts() {
  await requireBroker();
  const client = await createSupabaseServerClient();
  const rows: PublicAreaRow[] = [];
  const size = 500;
  for (let page = 0; page < 40; page++) {
    const { data, error } = await client.from("areas").select("slug,name,pincode,summary,description,highlights,parent_area,is_active").order("slug", { ascending: true }).range(page * size, page * size + size - 1);
    if (error) throw new Error("Failed to fetch broker areas");
    const batch = (data ?? []) as unknown as PublicAreaRow[];
    rows.push(...batch);
    if (batch.length < size) break;
    if (page === 39) throw new Error("Broker areas exceeded the safe read window");
  }
  return Promise.all(rows.map(async (row) => {
    async function count(publicOnly: boolean) {
      let query = client.from("properties").select("id", { count: "exact", head: true }).eq("area_slug", row.slug);
      if (publicOnly) query = query.in("status", ["available", "under-offer"]);
      const result = await query;
      if (result.error || typeof result.count !== "number") throw new Error("Failed to count area properties");
      return result.count;
    }
    const [propertyCount, publicPropertyCount] = await Promise.all([count(false), count(true)]);
    return { ...mapPublicArea(row), propertyCount, publicPropertyCount };
  }));
}
