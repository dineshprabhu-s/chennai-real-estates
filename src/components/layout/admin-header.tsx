import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { AdminMobileNav } from "@/components/layout/admin-mobile-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <AdminMobileNav />
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-foreground">
            Broker workspace
          </p>
          <p className="text-xs text-muted-foreground">
            Madipakkam, Chennai
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="outline" className="hidden sm:inline-flex">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-warning"
          />
          Sample data
        </Badge>
        <Button variant="outline" size="sm" asChild>
          <Link href="/">
            <span className="hidden sm:inline">View website</span>
            <span className="sm:hidden">Website</span>
            <ExternalLink aria-hidden="true" />
          </Link>
        </Button>
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
        >
          B
        </span>
      </div>
    </header>
  );
}
