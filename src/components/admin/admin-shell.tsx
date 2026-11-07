"use client";

import { useEffect, useState } from "react";

import { AdminHeader } from "@/components/layout/admin-header";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "cre-admin-sidebar-collapsed";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Reading persisted layout state after mount avoids a server/client
    // hydration mismatch. The state update is deferred out of the effect body.
    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      try {
        if (window.localStorage.getItem(STORAGE_KEY) === "true") {
          setCollapsed(true);
        }
      } catch {
        // Local storage is optional; the sidebar still works without it.
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;

      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore storage failures in private or restricted browsing modes.
      }

      return next;
    });
  }

  return (
    <div className="min-h-dvh bg-muted/30">
      <a
        href="#admin-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to admin content
      </a>

      <AdminSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />

      <div
        className={cn(
          "flex min-h-dvh flex-col transition-[padding] duration-200",
          collapsed ? "lg:pl-20" : "lg:pl-80",
        )}
      >
        <AdminHeader />

        <div
          role="note"
          className="border-b border-warning/25 bg-warning/10 px-4 py-2.5 text-center text-xs font-medium text-warning sm:px-6 lg:px-8"
        >
          Development preview — authentication and database persistence are not
          enabled.
        </div>

        <main
          id="admin-main-content"
          className="flex-1 px-4 py-8 sm:px-6 lg:px-8"
        >
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>

        <footer className="border-t border-border px-4 py-5 text-xs text-muted-foreground sm:px-6 lg:px-8">
          {siteConfig.name} · Admin development preview · No authentication or
          data persistence
        </footer>
      </div>
    </div>
  );
}
