import { Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

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
import { formatDate, formatPrice } from "@/lib/format";
import { propertyTypeLabels } from "@/modules/properties/constants";
import { getAllProperties } from "@/modules/properties/queries";

export const metadata: Metadata = {
  title: "Properties",
};

export default function AdminPropertiesPage() {
  const properties = getAllProperties();

  return (
    <div>
      <PageHeader
        variant="admin"
        eyebrow="Properties"
        title="Property management"
        description="Review and organise the listings that appear on the public website."
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
        The table below uses sample listings. Creating, editing, and publishing
        properties will be enabled with the property data layer.
      </Notice>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            {properties.length}
          </span>{" "}
          {properties.length === 1 ? "property" : "properties"} in the workspace
        </p>
        <p className="text-xs text-muted-foreground">
          Sample data · Not publicly editable
        </p>
      </div>

      <Card className="mt-4 gap-0 overflow-hidden">
        <div className="divide-y divide-border lg:hidden">
          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/admin/properties/${property.id}/edit`}
              className="block p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {property.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {property.locality} · {propertyTypeLabels[property.type]}
                  </p>
                </div>
                <PropertyStatusBadge status={property.status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="text-sm font-semibold text-foreground">
                  {formatPrice(property.price, property.listingType)}
                </span>
                <span>Updated {formatDate(property.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Property</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell className="min-w-64 pl-5">
                    <Link
                      href={`/admin/properties/${property.id}/edit`}
                      className="font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {property.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {property.id.toUpperCase()} · Listed{" "}
                      {formatDate(property.listedAt)}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {property.locality}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {propertyTypeLabels[property.type]}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {formatPrice(property.price, property.listingType)}
                  </TableCell>
                  <TableCell>
                    <PropertyStatusBadge status={property.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(property.updatedAt)}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <Button asChild variant="ghost" size="icon-sm">
                      <Link
                        href={`/admin/properties/${property.id}/edit`}
                        aria-label={`Edit ${property.title}`}
                      >
                        <Pencil aria-hidden="true" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
