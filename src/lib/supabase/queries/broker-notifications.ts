import "server-only";

import { requireBroker } from "@/lib/auth/broker";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type NotificationCustomerContext = "new" | "existing";

export interface BrokerNotification {
  id: string;
  leadId: string | null;
  customerName: string | null;
  customerContext: NotificationCustomerContext | null;
  propertyId: string | null;
  createdAt: string;
  readAt: string | null;
}
export interface NotificationSnapshot { items: BrokerNotification[]; unreadCount: number }

/** Broker-only, bounded read; no phone, email or enquiry message is selected. */
export async function getBrokerNotifications(): Promise<NotificationSnapshot> {
  await requireBroker();
  const client = await createSupabaseServerClient();
  const [recent, unread] = await Promise.all([
    client.from("broker_notifications").select("id,lead_id,notification_type,customer_context,created_at,read_at,leads(name,property_id,customers(name))")
      .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(20),
    client.from("broker_notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);
  if (recent.error || unread.error || typeof unread.count !== "number" || !recent.data) throw new Error("Failed to load broker notifications");
  type Row = {
    id: string; lead_id: string | null; customer_context: NotificationCustomerContext | null;
    created_at: string; read_at: string | null;
    leads: { name: string; property_id: string | null; customers: { name: string } | null } | null;
  };
  const items = (recent.data as unknown as Row[]).map((row) => ({
    id: row.id, leadId: row.leads ? row.lead_id : null,
    // Prefer the current customer name; fall back to the enquiry snapshot.
    customerName: row.leads?.customers?.name ?? row.leads?.name ?? null,
    customerContext: row.customer_context,
    propertyId: row.leads?.property_id ?? null, createdAt: row.created_at, readAt: row.read_at,
  }));
  return { items, unreadCount: unread.count };
}
