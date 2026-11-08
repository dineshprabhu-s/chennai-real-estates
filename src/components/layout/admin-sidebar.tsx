"use client";

import { ExternalLink, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";

import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { BrandMark, Logo } from "@/components/common/logo";
import { AdminNavLinks } from "@/components/layout/admin-nav-links";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function AdminSidebar({
  collapsed,
  onToggleCollapsed,
}: AdminSidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-card transition-[width] duration-200 lg:flex",
        collapsed ? "w-20" : "w-80",
      )}
    >
      <div
        className={cn(
          "flex h-20 shrink-0 items-center border-b border-border",
          collapsed ? "justify-center px-2" : "justify-between gap-3 px-6",
        )}
      >
        {collapsed ? (
          <Link
            href="/admin/dashboard"
            aria-label="Chennai Real Estates admin dashboard"
            className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
          >
            <BrandMark />
          </Link>
        ) : (
          <Logo href="/admin/dashboard" showTagline={false} />
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand admin sidebar" : "Collapse admin sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(collapsed && "absolute -right-3 top-6 z-10 size-6 rounded-full border border-border bg-card shadow-sm")}
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden="true" className="size-3.5" />
          ) : (
            <PanelLeftClose aria-hidden="true" className="size-4" />
          )}
        </Button>
      </div>

      <div
        className={cn(
          "flex-1 overflow-y-auto py-6",
          collapsed ? "px-3" : "px-4",
        )}
      >
        <p
          className={cn(
            "px-3 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase",
            collapsed && "sr-only",
          )}
        >
          Workspace
        </p>
        <AdminNavLinks className="mt-3 space-y-1" collapsed={collapsed} />
      </div>

      <div
        className={cn(
          "shrink-0 space-y-1 border-t border-border p-4",
          collapsed && "px-2",
        )}
      >
        <Link
          href="/"
          title={collapsed ? "Back to website" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
          {collapsed ? (
            <span className="sr-only">Back to website</span>
          ) : (
            "Back to Website"
          )}
        </Link>
        <AdminLogoutButton collapsed={collapsed} />
      </div>
    </aside>
  );
}
