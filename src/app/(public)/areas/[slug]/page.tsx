import { ArrowLeft, ArrowRight, Check, MapPin, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/common/container";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { PropertyGrid } from "@/components/property/property-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { getPublicAreaBySlug } from "@/lib/supabase/queries/areas";
import {
  listingTypeLabels,
  listingTypeOptions,
} from "@/modules/properties/constants";
import { getPublicPropertiesByArea } from "@/lib/supabase/queries/properties";
import type { ListingType } from "@/types/property";
import { cn } from "@/lib/utils";

export const instant = false;

interface AreaPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseListingType(
  value: string | string[] | undefined,
): ListingType | null {
  const raw = Array.isArray(value) ? value[0] : value;

  if (!raw) {
    return null;
  }

  return listingTypeOptions.find((option) => option.value === raw)?.value ?? null;
}

export async function generateMetadata({
  params,
}: AreaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const area = await getPublicAreaBySlug(slug);

  if (!area) {
    return { title: "Area not found" };
  }

  return {
    title: `Properties in ${area.name}`,
    description: area.summary,
    openGraph: {
      title: `Properties in ${area.name}, Chennai`,
      description: area.summary,
      url: `/areas/${area.slug}`,
    },
  };
}

export default async function AreaDetailPage({
  params,
  searchParams,
}: AreaPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const area = await getPublicAreaBySlug(slug);

  if (!area) {
    notFound();
  }

  const selectedListingType = parseListingType(query.listingType);
  const allProperties = await getPublicPropertiesByArea(area.slug);
  const properties = selectedListingType
    ? allProperties.filter(
        (property) => property.listingType === selectedListingType,
      )
    : allProperties;

  const filterOptions: Array<{
    value: ListingType | null;
    label: string;
  }> = [
    { value: null, label: "All listings" },
    ...listingTypeOptions.map((option) => ({
      value: option.value,
      label: option.label,
    })),
  ];

  return (
    <Container className="py-10 sm:py-14">
      <Link
        href="/areas"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All areas
      </Link>

      <div className="mt-7">
        <PageHeader
          eyebrow="Area guide"
          title={`Properties in ${area.name}`}
          description={area.description}
          actions={
            <Button asChild>
              <Link href={siteConfig.links.contact}>
                Ask about {area.name}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          }
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Badge variant="outline">
          <MapPin aria-hidden="true" />
          {area.pincode}
        </Badge>
        <Badge variant="secondary">
          {allProperties.length}{" "}
          {allProperties.length === 1 ? "property" : "properties"}
        </Badge>
        <Badge variant="outline">Chennai, Tamil Nadu</Badge>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="gap-4 p-6">
          <h2 className="text-base font-semibold text-foreground">
            Why consider {area.name}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {area.summary}
          </p>
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {area.highlights.map((highlight) => (
              <li
                key={highlight}
                className="flex items-start gap-2.5 text-sm text-muted-foreground"
              >
                <Check
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-primary"
                />
                {highlight}
              </li>
            ))}
          </ul>
        </Card>

        <Notice>
          Verify schools, transport, property details, and approval status
          independently before making a decision.
        </Notice>
      </div>

      <section aria-labelledby="area-listings" className="mt-14">
        <div className="flex flex-col gap-5 border-b border-border pb-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2
                id="area-listings"
                className="font-display text-3xl tracking-tight text-foreground"
              >
                Available in {area.name}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {properties.length}{" "}
                {properties.length === 1 ? "listing" : "listings"}
                {selectedListingType
                  ? ` · ${listingTypeLabels[selectedListingType]}`
                  : " · all transaction types"}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/properties?areaSlug=${area.slug}`}>
                Open in full catalogue
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => {
              const href = option.value
                ? `/areas/${area.slug}?listingType=${option.value}`
                : `/areas/${area.slug}`;
              const active = option.value === selectedListingType;

              return (
                <Link
                  key={option.label}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-primary",
                  )}
                >
                  {option.label}
                </Link>
              );
            })}
            {selectedListingType ? (
              <Link
                href={`/areas/${area.slug}`}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                <RotateCcw aria-hidden="true" className="size-3" />
                Clear
              </Link>
            ) : null}
          </div>
        </div>

        <PropertyGrid
          className="mt-8"
          properties={properties}
          emptyTitle={
            selectedListingType
              ? `No ${listingTypeLabels[selectedListingType].toLowerCase()} listings in ${area.name}`
              : `No listings in ${area.name} yet`
          }
          emptyDescription="Try another transaction type or browse the full catalogue for nearby options."
          emptyAction={
            selectedListingType ? (
              <Button asChild variant="outline">
                <Link href={`/areas/${area.slug}`}>
                  <RotateCcw aria-hidden="true" />
                  Clear transaction filter
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/properties">Browse all properties</Link>
              </Button>
            )
          }
        />
      </section>
    </Container>
  );
}
