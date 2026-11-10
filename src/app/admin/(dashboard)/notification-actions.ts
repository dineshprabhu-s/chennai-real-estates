"use server";

import { requireBroker } from "@/lib/auth/broker";
import { getBrokerNotifications, type NotificationSnapshot } from "@/lib/supabase/queries/broker-notifications";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoadResult = { ok: true; snapshot: NotificationSnapshot } | { ok: false; message: string };
type WriteResult = { ok: true } | { ok: false; message: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadBrokerNotifications(): Promise<LoadResult> {
  await requireBroker();
  try { return { ok: true, snapshot: await getBrokerNotifications() }; }
  catch { return { ok: false, message: "Notifications could not be loaded. Try again." }; }
}
export async function markBrokerNotificationRead(id: unknown): Promise<WriteResult> {
  await requireBroker();
  if (typeof id !== "string" || !uuid.test(id)) return { ok: false, message: "Invalid notification." };
  try {
    const client = await createSupabaseServerClient();
    const { data, error } = await client.from("broker_notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null).select("id").maybeSingle();
    if (error) return { ok: false, message: "Could not mark the notification as read." };
    if (!data) {
      const existing = await client.from("broker_notifications").select("id").eq("id", id).maybeSingle();
      if (existing.error || !existing.data) return { ok: false, message: "Notification is no longer available." };
    }
    return { ok: true };
  } catch { return { ok: false, message: "Could not mark the notification as read." }; }
}
export async function markAllBrokerNotificationsRead(): Promise<WriteResult> {
  await requireBroker();
  try {
    const client = await createSupabaseServerClient();
    const { error } = await client.from("broker_notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    return error ? { ok: false, message: "Could not mark notifications as read." } : { ok: true };
  } catch { return { ok: false, message: "Could not mark notifications as read." }; }
}
