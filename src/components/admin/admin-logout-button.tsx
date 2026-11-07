"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { cn } from "@/lib/utils";

interface AdminLogoutButtonProps {
  collapsed?: boolean;
  className?: string;
}

/**
 * Demo sign-out control. Authentication is not implemented, so this opens a
 * confirmation dialog and never claims that a session was ended.
 */
export function AdminLogoutButton({
  collapsed = false,
  className,
}: AdminLogoutButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={collapsed ? "Logout (demo)" : undefined}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          collapsed && "justify-center px-0",
          className,
        )}
      >
        <LogOut aria-hidden="true" className="size-4 shrink-0" />
        {collapsed ? (
          <span className="sr-only">Logout (demo)</span>
        ) : (
          <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
            Logout
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold tracking-wide text-warning uppercase">
              Demo
            </span>
          </span>
        )}
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Logout is a demo action"
        description="Authentication is not enabled in this development preview. No session exists to end, and you will remain in the workspace."
        confirmLabel="Stay in workspace"
        cancelLabel="Close"
        onConfirm={() => setOpen(false)}
      />
    </>
  );
}
