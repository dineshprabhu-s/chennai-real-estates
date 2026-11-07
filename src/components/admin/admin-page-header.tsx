import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type * as React from "react";

import { PageHeader } from "@/components/common/page-header";

export interface AdminBreadcrumb {
  label: string;
  href?: string;
}

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  breadcrumbs?: AdminBreadcrumb[];
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Shared page heading used across the admin workspace. The breadcrumb is kept
 * presentational so individual pages decide their own hierarchy.
 */
export function AdminPageHeader({
  title,
  description,
  eyebrow,
  breadcrumbs,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div className={className}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <li>
              <Link
                href="/admin/dashboard"
                className="transition-colors hover:text-foreground"
              >
                Admin
              </Link>
            </li>
            {breadcrumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                <ChevronRight aria-hidden="true" className="size-3" />
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="font-medium text-foreground">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <PageHeader
        variant="admin"
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
      />
    </div>
  );
}
