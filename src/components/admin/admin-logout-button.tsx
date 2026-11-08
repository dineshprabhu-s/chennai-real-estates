"use client";

import { LogOut } from "lucide-react";

import { logoutAction } from "@/app/admin/(dashboard)/actions";
import { cn } from "@/lib/utils";

interface AdminLogoutButtonProps {
  collapsed?: boolean;
  className?: string;
}

/**
 * Signs the broker out through the protected Server Action. Rendering the
 * control as a form submit keeps logout working without client-side JavaScript.
 */
export function AdminLogoutButton({
  collapsed = false,
  className,
}: AdminLogoutButtonProps) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        title={collapsed ? "Logout" : undefined}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          collapsed && "justify-center px-0",
          className,
        )}
      >
        <LogOut aria-hidden="true" className="size-4 shrink-0" />
        {collapsed ? (
          <span className="sr-only">Logout</span>
        ) : (
          <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
            Logout
          </span>
        )}
      </button>
    </form>
  );
}
