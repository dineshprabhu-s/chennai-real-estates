"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { loadBrokerNotifications, markAllBrokerNotificationsRead, markBrokerNotificationRead } from "@/app/admin/(dashboard)/notification-actions";
import { AdminModal } from "@/components/admin/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import type { NotificationSnapshot } from "@/lib/supabase/queries/broker-notifications";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<NotificationSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(false);
  const router = useRouter();

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const result = await loadBrokerNotifications();
      if (!mounted.current) return;
      if (result.ok) { setSnapshot(result.snapshot); setError(null); }
      else { setSnapshot(null); setError(result.message); }
    } catch {
      if (mounted.current) { setSnapshot(null); setError("Notifications could not be loaded. Try again."); }
    } finally { busy.current = false; }
  }, []);

  useEffect(() => {
    mounted.current = true;
    queueMicrotask(() => { if (mounted.current) void refresh(); });
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 30000);
    function onVisible() { if (document.visibilityState === "visible") void refresh(); }
    document.addEventListener("visibilitychange", onVisible);
    return () => { mounted.current = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [refresh]);

  async function mark(id: string, leadId?: string | null) {
    if (busy.current) { setError("Please wait for notifications to finish loading."); return; }
    busy.current = true; setPending(true); setError(null);
    let saved = false;
    try {
      const result = await markBrokerNotificationRead(id);
      if (!result.ok) { setError(result.message); return; }
      saved = true;
      if (leadId) { setOpen(false); router.push(`/admin/leads?lead=${encodeURIComponent(leadId)}`); }
    } catch { setError("Could not mark the notification as read."); }
    finally { busy.current = false; setPending(false); if (saved) void refresh(); }
  }
  async function markAll() {
    if (busy.current) { setError("Please wait for notifications to finish loading."); return; }
    busy.current = true; setPending(true); setError(null);
    try { const result = await markAllBrokerNotificationsRead(); if (!result.ok) setError(result.message); }
    catch { setError("Could not mark notifications as read."); }
    finally { busy.current = false; setPending(false); const result = await loadBrokerNotifications().catch(() => null); if (result?.ok) setSnapshot(result.snapshot); else { setSnapshot(null); setError("Notifications could not be loaded."); } }
  }
  const count = snapshot?.unreadCount;
  return <>
    <button type="button" title="Notifications" aria-label={count ? `Notifications, ${count} unread` : "Notifications"} aria-expanded={open}
      className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), "relative")}
      onClick={() => { setOpen(true); void refresh(); }}>
      <Bell aria-hidden="true" className="size-4" />
      {count ? <span className="absolute -top-2 -right-2 rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{count > 9 ? "9+" : count}</span> : null}
      {error ? <span className="absolute -top-1 -right-1 size-2 rounded-full bg-destructive" aria-hidden="true" /> : null}
    </button>
    <AdminModal open={open} onClose={() => setOpen(false)} title="Notifications" description="New enquiries appear here. Notifications are shared by broker accounts." variant="drawer">
      {error ? <p role="alert" className="mb-4 text-sm text-destructive">{error} <button className="underline" type="button" onClick={() => void refresh()}>Retry</button></p> : null}
      {!snapshot && !error ? <p role="status" className="text-sm text-muted-foreground">Loading notifications…</p> : null}
      {snapshot ? <>
        <div className="mb-4 flex justify-end"><Button type="button" size="sm" variant="outline" disabled={pending || snapshot.unreadCount === 0} onClick={markAll}>Mark all as read</Button></div>
        {snapshot.items.length === 0 ? <p className="text-sm text-muted-foreground">You’re all caught up. New enquiry notifications will appear here.</p> : null}
        <ul className="divide-y divide-border">
          {snapshot.items.map((item) => <li key={item.id} className="py-4">
            <div className="flex items-center gap-2"><p className="font-semibold">New enquiry</p>{!item.readAt ? <span className="rounded bg-accent px-2 py-0.5 text-xs font-semibold">Unread</span> : <span className="text-xs text-muted-foreground">Read</span>}</div>
            <p className="mt-1 text-sm">{item.customerName ? `New ${item.propertyId ? "property" : "general"} enquiry from ${item.customerName}.` : "The associated enquiry is no longer available."}</p>
            {item.propertyId ? <p className="text-xs text-muted-foreground">Property {item.propertyId}</p> : null}
            <time className="text-xs text-muted-foreground" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</time>
            <div className="mt-2 flex gap-2">
              {item.leadId ? <Button type="button" size="sm" disabled={pending} onClick={() => item.readAt ? (setOpen(false), router.push(`/admin/leads?lead=${encodeURIComponent(item.leadId!)}`)) : void mark(item.id, item.leadId)}>Open enquiry</Button> : null}
              {!item.readAt ? <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => void mark(item.id)}>Mark as read</Button> : null}
            </div>
          </li>)}
        </ul>
      </> : null}
    </AdminModal>
  </>;
}
