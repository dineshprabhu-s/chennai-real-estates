import { ArrowLeft, ArrowRight, Check, MapPin } from "lucide-react";
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
import {
  getAreaBySlug,
  getPublicAreasWithCounts,
} from "@/modules/areas/queries";
import { getPropertiesByArea } from "@/modules/properties/queries";

interface AreaPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getPublicAreasWithCounts().map((area) => ({ slug: area.slug }));
}

export async function generateMetadata({
  params,
}: AreaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const area = getAreaBySlug(slug);

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

export default async function AreaDetailPage({ params }: AreaPageProps) {
  const { slug } = await params;
  const area = getAreaBySlug(slug);

  if (!area) {
    notFound();
  }

  const properties = getPropertiesByArea(area.slug);

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
          {properties.length} {properties.length === 1 ? "listing" : "listings"}
        </Badge>
        <Badge variant="outline">Chennai, Tamil Nadu</Badge>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="gap-4 p-6">
          <h2 className="text-base font-semibold text-foreground">
            Why consider {area.name}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {area.summary}
          </p>
          <ul className="grid gap-2.5 sm:grid-cols-2">
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
          Area notes and listings are sample content for the foundation build.
          Verify schools, transport, and property details independently before
          making a decision.
        </Notice>
      </div>

      <section aria-labelledby="area-listings" className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
          <div>
            <h2
              id="area-listings"
              className="font-display text-3xl tracking-tight text-foreground"
            >
              Available in {area.name}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sample listings currently mapped to this area.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/properties">
              All properties
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <PropertyGrid
          className="mt-8"
          properties={properties}
          emptyTitle={`No listings in ${area.name} yet`}
          emptyDescription="New properties in this area will appear here once they are published."
        />
      </section>
    </Container>
  );
}
