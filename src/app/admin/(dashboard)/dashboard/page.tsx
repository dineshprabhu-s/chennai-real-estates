import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Plus,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { StatCard } from "@/components/admin/stat-card";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { PropertyStatusBadge } from "@/components/property/property-status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/format";
import { getAreasWithCounts } from "@/modules/areas/queries";
import { getLeadStatusCounts } from "@/modules/leads/queries";
import { propertyTypeLabels } from "@/modules/properties/constants";
import {
  getAllProperties,
  getPropertyStats,
} from "@/modules/properties/queries";

export const metadata: Metadata = {
  title: "Dashboard",
};

const quickActions = [
  {
    label: "Add a new property",
    description: "Draft a listing for the public site.",
    href: "/admin/properties/new",
    icon: Plus,
  },
  {
    label: "Review enquiries",
    description: "See new and ongoing conversations.",
    href: "/admin/leads",
    icon: Users,
  },
  {
    label: "Manage areas",
    description: "Review the neighbourhoods you cover.",
    href: "/admin/areas",
    icon: MapPin,
  },
];

const foundationChecks = [
  "Broker authentication",
  "Database and property storage",
  "Enquiry submission and lead inbox",
  "Area and property editing",
];

export default function AdminDashboardPage() {
  const stats = getPropertyStats();
  const properties = getAllProperties().slice(0, 4);
  const areas = getAreasWithCounts();
  const leadCounts = getLeadStatusCounts();

  return (
    <div>
      <PageHeader
        variant="admin"
        eyebrow="Overview"
        title="Welcome to the broker workspace"
        description="A clear view of your listings, enquiries, and area coverage. The shell is ready; live data and authentication come next."
        actions={
          <Button asChild>
            <Link href="/admin/properties/new">
              <Plus aria-hidden="true" />
              Add property
            </Link>
          </Button>
        }
      />

      <Notice className="mt-6">
        This dashboard is populated with sample listings. No authentication or
        database connection is active in this foundation build.
      </Notice>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total listings"
          value={stats.total}
          description="All properties in the sample workspace."
          icon={Building2}
        />
        <StatCard
          label="Available now"
          value={stats.available}
          description="Listings currently marked available."
          icon={CheckCircle2}
        />
        <StatCard
          label="New enquiries"
          value={leadCounts.new}
          description="Inbox will populate with the leads module."
          icon={Users}
        />
        <StatCard
          label="Areas covered"
          value={areas.length}
          description="Madipakkam and nearby neighbourhoods."
          icon={MapPin}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="gap-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Recent listings
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The latest sample properties in the workspace.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/properties">
                View all
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="divide-y divide-border border-t border-border lg:hidden">
            {properties.map((property) => (
              <Link
                key={property.id}
                href={`/admin/properties/${property.id}/edit`}
                className="flex items-start justify-between gap-4 p-5 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {property.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {property.locality} · {propertyTypeLabels[property.type]}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {formatPrice(property.price, property.listingType)}
                  </p>
                </div>
                <PropertyStatusBadge status={property.status} />
              </Link>
            ))}
          </div>

          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Property</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="pr-5">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell className="pl-5">
                      <Link
                        href={`/admin/properties/${property.id}/edit`}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {property.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {propertyTypeLabels[property.type]} · {property.id}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {property.locality}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {formatPrice(property.price, property.listingType)}
                    </TableCell>
                    <TableCell className="pr-5">
                      <PropertyStatusBadge status={property.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="gap-4 p-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Quick actions
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Common tasks in the workspace.
              </p>
            </div>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/30 hover:bg-muted/50"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
                    <action.icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">
                      {action.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {action.description}
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="mt-1 size-4 shrink-0 text-muted-foreground"
                  />
                </Link>
              ))}
            </div>
          </Card>

          <Card className="gap-4 p-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Foundation checklist
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Planned for the next implementation stages.
              </p>
            </div>
            <ul className="space-y-2.5">
              {foundationChecks.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-muted-foreground"
                >
                  <span
                    aria-hidden="true"
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
