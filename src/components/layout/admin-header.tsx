"use client";

import { Bell, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AdminMobileNav } from "@/components/layout/admin-mobile-nav";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeaderContext {
  section: string;
  title: string;
}

function getHeaderContext(pathname: string): HeaderContext {
  if (pathname === "/admin/dashboard") {
    return { section: "Dashboard", title: "Overview" };
  }

  if (pathname === "/admin/properties/new") {
    return { section: "Properties", title: "Add property" };
  }

  if (/^\/admin\/properties\/[^/]+\/edit$/.test(pathname)) {
    return { section: "Properties", title: "Edit property" };
  }

  if (pathname.startsWith("/admin/properties")) {
    return { section: "Properties", title: "Property management" };
  }

  if (pathname.startsWith("/admin/leads")) {
    return { section: "Leads", title: "Customer enquiries" };
  }

  if (pathname.startsWith("/admin/areas")) {
    return { section: "Areas", title: "Area management" };
  }

  return { section: "Workspace", title: "Broker admin" };
}

export function AdminHeader() {
  const pathname = usePathname();
  const context = getHeaderContext(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <AdminMobileNav />
        <div className="min-w-0">
          <nav aria-label="Admin breadcrumb">
            <ol className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <li>Admin</li>
              <li aria-hidden="true">
                <ChevronRight className="size-3" />
              </li>
              <li>{context.section}</li>
              {context.title !== context.section ? (
                <>
                  <li aria-hidden="true">
                    <ChevronRight className="size-3" />
                  </li>
                  <li className="font-medium text-foreground">{context.title}</li>
                </>
              ) : null}
            </ol>
          </nav>
          <p className="truncate text-sm font-semibold text-foreground">
            {context.title}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Badge variant="outline" className="hidden md:inline-flex">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-warning"
          />
          Demo session
        </Badge>

        <button
          type="button"
          title="Notifications are a development preview"
          aria-label="Notifications, development preview"
          className={cn(
            buttonVariants({ variant: "outline", size: "icon-sm" }),
            "relative",
          )}
        >
          <Bell aria-hidden="true" className="size-4" />
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-warning"
          />
        </button>

        <Link
          href="/"
          aria-label="Open public website"
          title="Open public website"
          className={cn(
            buttonVariants({ variant: "outline", size: "icon-sm" }),
            "hidden sm:inline-flex",
          )}
        >
          <ExternalLink aria-hidden="true" className="size-4" />
        </Link>

        <div className="flex items-center gap-2 border-l border-border pl-2 sm:pl-3">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          >
            B
          </span>
          <div className="hidden leading-tight lg:block">
            <p className="text-xs font-semibold text-foreground">Broker</p>
            <p className="text-[11px] text-muted-foreground">Demo profile</p>
          </div>
        </div>
      </div>
    </header>
  );
}
