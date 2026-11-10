import "server-only";

import { requireBroker } from "@/lib/auth/broker";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PropertyStatus, ListingType } from "@/types/property";

export async function getBrokerPropertyStats() {
  await requireBroker();
  const client = await createSupabaseServerClient();
  async function count(status?: PropertyStatus) {
    const query = client.from("properties").select("id", { count: "exact", head: true });
    const result = await (status ? query.eq("status", status) : query);
    if (result.error || typeof result.count !== "number") throw new Error("Failed to count broker properties");
    return result.count;
  }
  const [total, available, underOffer, closed] = await Promise.all([count(), count("available"), count("under-offer"), count("sold")]);
  return { total, available, underOffer, closed };
}

export async function getRecentBrokerProperties(limit = 5) {
  await requireBroker();
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(0, Math.trunc(limit)), 20) : 5;
  if (!safeLimit) return [];
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from("properties")
    .select("id,title,locality,listing_type,price,status,updated_at")
    .order("updated_at", { ascending: false }).order("id", { ascending: true }).limit(safeLimit);
  if (error) throw new Error("Failed to fetch recent broker properties");
  return (data as unknown as Array<{id: string; title: string; locality: string; listing_type: ListingType; price: number | string; status: PropertyStatus; updated_at: string}>).map((row) => {
    if (typeof row.price === "string" && !/^[+]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(row.price)) throw new Error("Invalid property price");
    const price = Number(row.price);
    if (!Number.isFinite(price)) throw new Error("Invalid property price");
    return { id: row.id, title: row.title, locality: row.locality, listingType: row.listing_type, price, status: row.status, updatedAt: row.updated_at };
  });
}
