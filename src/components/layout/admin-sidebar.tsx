import { ExternalLink, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/common/logo";
import { AdminNavLinks } from "@/components/layout/admin-nav-links";

export function AdminSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-80 flex-col border-r border-border bg-card lg:flex">
      <div className="flex h-20 shrink-0 items-center border-b border-border px-6">
        <Logo showTagline={false} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <p className="px-3 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          Workspace
        </p>
        <AdminNavLinks className="mt-3 space-y-1" />

        <div className="mt-8 rounded-lg border border-dashed border-border bg-muted/40 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <ShieldAlert aria-hidden="true" className="size-3.5 text-warning" />
            Foundation build
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Authentication and data storage are not connected yet. Admin screens
            currently show sample data.
          </p>
        </div>
      </div>

      <div className="shrink-0 border-t border-border p-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ExternalLink aria-hidden="true" className="size-4" />
          View public website
        </Link>
      </div>
    </aside>
  );
}
