import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/common/container";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { PropertyGrid } from "@/components/property/property-grid";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getPublicAreasWithCounts } from "@/modules/areas/queries";
import { getPublicProperties } from "@/modules/properties/queries";

export const metadata: Metadata = {
  title: "Properties",
  description:
    "Browse sample property listings in Madipakkam, Keelkattalai, Pallikaranai, and Velachery. Apartments, independent houses, and plots with direct broker guidance.",
};

const areaChipClass =
  "rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary";

export default function PropertiesPage() {
  const properties = getPublicProperties();
  const areas = getPublicAreasWithCounts();

  return (
    <Container className="py-12 sm:py-16">
      <PageHeader
        eyebrow="Properties"
        title="Homes in and around Madipakkam"
        description="A focused set of apartments, independent houses, and plots. Each listing is presented with the details that matter before you pick up the phone."
        actions={
          <Button asChild>
            <Link href={siteConfig.links.contact}>Talk to the broker</Link>
          </Button>
        }
      />

      <Notice className="mt-8">
        Listings on this page are sample content for interface development. Real
        properties will replace them once the property data layer is connected.
      </Notice>

      <div className="mt-8 flex flex-col gap-4 border-b border-border pb-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-semibold text-foreground">
            {properties.length}
          </span>{" "}
          {properties.length === 1 ? "sample listing" : "sample listings"}
        </p>
        <div className="flex flex-wrap gap-2">
          {areas.map((area) => (
            <Link
              key={area.slug}
              href={`/areas/${area.slug}`}
              className={areaChipClass}
            >
              {area.name}
            </Link>
          ))}
        </div>
      </div>

      <PropertyGrid
        className="mt-10"
        properties={properties}
        emptyTitle="No listings yet"
        emptyDescription="New properties will appear here once they are published."
      />
    </Container>
  );
}
