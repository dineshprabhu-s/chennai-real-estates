import {
  BadgeCheck,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Handshake,
  Inbox,
  MapPin,
  Plus,
  Search,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AdminPropertyStatusBadge,
  LeadStatusBadge,
} from "@/components/admin/badges";
import { StatCard } from "@/components/admin/stat-card";
import { Notice } from "@/components/common/notice";
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
import { requireBroker } from "@/lib/auth/broker";
import { formatDate, formatPrice } from "@/lib/format";
import { leadSourceLabels } from "@/modules/leads/constants";
import { getLeadStats, getRecentLeads } from "@/modules/leads/queries";
import { listingTypeLabels } from "@/modules/properties/constants";
import {
  getPropertyById,
  getPropertyStats,
  getRecentProperties,
} from "@/modules/properties/queries";

export const metadata: Metadata = {
  title: "Dashboard",
};

// Session-guarded admin pages are allowed to block during navigation.
export const instant = false;

const quickActions = [
  {
    label: "Add new property",
    description: "Prepare a listing with pricing, verification, and images.",
    href: "/admin/properties/new",
    icon: Plus,
  },
  {
    label: "View all properties",
    description: "Search and filter all nine demo listings.",
    href: "/admin/properties",
    icon: Building2,
  },
  {
    label: "View new enquiries",
    description: "Open demo enquiries that are awaiting a first response.",
    href: "/admin/leads?status=new",
    icon: Inbox,
  },
  {
    label: "Manage areas",
    description: "Review the localities and their mapped demo listings.",
    href: "/admin/areas",
    icon: MapPin,
  },
];

export default async function AdminDashboardPage() {
  await requireBroker();

  const propertyStats = getPropertyStats();
  const leadStats = getLeadStats();
  const recentProperties = getRecentProperties(5);
  const recentLeads = getRecentLeads(5);

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[{ label: "Dashboard" }]}
        eyebrow="Overview"
        title="Broker dashboard"
        description="A live summary of the demo property catalogue and seeded enquiries. Every figure is calculated from the in-memory sample data, not hardcoded."
        actions={
          <Button asChild>
            <Link href="/admin/properties/new">
              <Plus aria-hidden="true" />
              Add Property
            </Link>
          </Button>
        }
      />

      <Notice className="mt-6">
        Development preview — statistics reflect the nine demo property records
        and seeded sample enquiries. No production data is connected.
      </Notice>

      <section aria-labelledby="property-stats-heading" className="mt-8">
        <h2
          id="property-stats-heading"
          className="text-sm font-semibold tracking-[0.12em] text-muted-foreground uppercase"
        >
          Property catalogue
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total properties"
            value={propertyStats.total}
            description="All demo records, including drafts."
            icon={Building2}
          />
          <StatCard
            label="Available"
            value={propertyStats.available}
            description="Listed as available in the demo catalogue."
            icon={CheckCircle2}
          />
          <StatCard
            label="Under negotiation"
            value={propertyStats.underOffer}
            description="Properties currently under offer or negotiation."
            icon={Handshake}
          />
          <StatCard
            label="Closed"
            value={propertyStats.closed}
            description="Deals closed in the demo catalogue."
            icon={BadgeCheck}
          />
        </div>
      </section>

      <section aria-labelledby="lead-stats-heading" className="mt-8">
        <h2
          id="lead-stats-heading"
          className="text-sm font-semibold tracking-[0.12em] text-muted-foreground uppercase"
        >
          Enquiries
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="New enquiries"
            value={leadStats.new}
            description="Seeded demo enquiries awaiting a first response."
            icon={Inbox}
          />
          <StatCard
            label="Pending enquiries"
            value={leadStats.pending}
            description="Open enquiries across new, contacted, and visit-scheduled."
            icon={Clock}
          />
          <StatCard
            label="Scheduled visits"
            value={leadStats.scheduledVisits}
            description="Visit scheduling is separate from property availability."
            icon={CalendarCheck}
          />
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="gap-0 overflow-hidden xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Recent properties
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Most recently updated demo listings
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/properties">View all</Link>
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">ID</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Locality</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="sticky right-0 z-10 bg-card pr-5 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentProperties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell className="pl-5 align-top font-mono text-xs font-semibold whitespace-nowrap">
                    {property.id}
                  </TableCell>
                  <TableCell className="min-w-56 align-top">
                    <Link
                      href={`/admin/properties/${property.id}/edit`}
                      className="font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {property.title}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Updated {formatDate(property.updatedAt)}
                    </p>
                  </TableCell>
                  <TableCell className="align-top whitespace-nowrap text-muted-foreground">
                    {property.locality}
                  </TableCell>
                  <TableCell className="align-top whitespace-nowrap text-muted-foreground">
                    {listingTypeLabels[property.listingType]}
                  </TableCell>
                  <TableCell className="align-top font-medium whitespace-nowrap">
                    {formatPrice(property.price, property.listingType)}
                  </TableCell>
                  <TableCell className="align-top">
                    <AdminPropertyStatusBadge status={property.status} />
                  </TableCell>
                  <TableCell className="sticky right-0 bg-card pr-5 text-right align-top">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/properties/${property.id}/edit`}>
                        Edit
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="gap-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                Recent enquiries
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold tracking-wide text-warning uppercase">
                  Demo
                </span>
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Seeded sample leads, not real customers
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/leads">View all</Link>
            </Button>
          </div>

          <ul className="divide-y divide-border">
            {recentLeads.map((lead) => {
              const property = lead.propertyId
                ? getPropertyById(lead.propertyId)
                : undefined;

              return (
                <li key={lead.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {lead.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {lead.phone}
                      </p>
                    </div>
                    <LeadStatusBadge status={lead.status} />
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground">
                    {property ? property.title : "General enquiry"}
                    {property ? ` · ${property.id}` : ""}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(lead.createdAt)}
                      {lead.source
                        ? ` · ${leadSourceLabels[lead.source]}`
                        : ""}
                    </p>
                    <Button asChild variant="link" size="sm" className="h-auto p-0">
                      <Link href={`/admin/leads?lead=${lead.id}`}>
                        View enquiry
                      </Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <section aria-labelledby="quick-actions-heading" className="mt-8">
        <h2
          id="quick-actions-heading"
          className="text-sm font-semibold tracking-[0.12em] text-muted-foreground uppercase"
        >
          Quick actions
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/25 focus-visible:outline-none"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                <action.icon aria-hidden="true" className="size-4" />
              </span>
              <p className="mt-3 text-sm font-semibold text-foreground">
                {action.label}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {action.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Search aria-hidden="true" className="size-3.5" />
        Statistics are derived from demo queries and update only if the
        underlying sample data changes. They are not live business figures.
      </p>
    </div>
  );
}
