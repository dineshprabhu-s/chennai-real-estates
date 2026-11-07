import { RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/common/container";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { PropertyFiltersForm } from "@/components/property/property-filters";
import { PropertyGrid } from "@/components/property/property-grid";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getPublicAreasWithCounts } from "@/modules/areas/queries";
import {
  countActivePropertyFilters,
  filterProperties,
  parsePropertyFilters,
  type PropertySearchParams,
} from "@/modules/properties/filters";
import { getPublicProperties } from "@/modules/properties/queries";

export const instant = false;

export const metadata: Metadata = {
  title: "Properties",
  description:
    "Browse sale, rent, and lease properties in Madipakkam, Keelkattalai, Pallikaranai, and Velachery with direct broker guidance.",
};

interface PropertiesPageProps {
  searchParams: Promise<PropertySearchParams>;
}

export default async function PropertiesPage({
  searchParams,
}: PropertiesPageProps) {
  const params = await searchParams;
  const filters = parsePropertyFilters(params);
  const allProperties = getPublicProperties();
  const properties = filterProperties(allProperties, filters);
  const activeFilterCount = countActivePropertyFilters(filters);
  const areas = getPublicAreasWithCounts();

  return (
    <Container className="py-12 sm:py-16">
      <PageHeader
        eyebrow="Property catalogue"
        title="Homes in and around Madipakkam"
        description="Browse sale, rent, and lease listings with the details that matter before a visit: locality, configuration, price, area, facing, and approval status where known."
        actions={
          <Button asChild>
            <Link href={siteConfig.links.contact}>Talk to the broker</Link>
          </Button>
        }
      />

      <Notice className="mt-8">
        Listings are sample data for interface development. Availability,
        prices, measurements, and approval status must be verified with the
        broker before you act on a listing.
      </Notice>

      <PropertyFiltersForm
        areas={areas}
        filters={filters}
        className="mt-8"
      />

      <div className="mt-8 flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {properties.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">
              {allProperties.length}
            </span>{" "}
            {allProperties.length === 1 ? "property" : "properties"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeFilterCount > 0
              ? `${activeFilterCount} ${activeFilterCount === 1 ? "filter" : "filters"} applied`
              : "All current catalogue entries"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {areas.map((area) => (
            <Link
              key={area.slug}
              href={`/properties?areaSlug=${area.slug}`}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              {area.name}
            </Link>
          ))}
        </div>
      </div>

      <PropertyGrid
        className="mt-8"
        properties={properties}
        emptyTitle="No properties match these filters"
        emptyDescription="Try a broader locality, a different transaction type, or clear the price range."
        emptyAction={
          <Button asChild variant="outline">
            <Link href="/properties">
              <RotateCcw aria-hidden="true" />
              Clear filters
            </Link>
          </Button>
        }
      />
    </Container>
  );
}
