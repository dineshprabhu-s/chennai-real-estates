"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminNavigation } from "@/config/admin-navigation";
import { cn } from "@/lib/utils";

interface AdminNavLinksProps {
  className?: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function AdminNavLinks({
  className,
  collapsed = false,
  onNavigate,
}: AdminNavLinksProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className={className}>
      {adminNavigation.map((item) => {
        const excluded = item.excludePrefixes?.some((prefix) =>
          pathname.startsWith(prefix),
        );
        const isActive =
          !excluded &&
          (item.exact
            ? pathname === item.href
            : pathname === item.href ||
              pathname.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              collapsed && "justify-center px-0",
              isActive
                ? "bg-accent text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon aria-hidden="true" className="size-4 shrink-0" />
            {collapsed ? (
              <span className="sr-only">{item.label}</span>
            ) : (
              item.label
            )}
          </Link>
        );
      })}
    </nav>
  );
}
