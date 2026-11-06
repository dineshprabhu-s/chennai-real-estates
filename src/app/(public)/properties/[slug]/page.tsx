import {
  ArrowLeft,
  ArrowRight,
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  Check,
  Mail,
  MapPin,
  Maximize2,
  Phone,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/common/container";
import { Notice } from "@/components/common/notice";
import { PropertyGrid } from "@/components/property/property-grid";
import { PropertyStatusBadge } from "@/components/property/property-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { formatArea, formatDate, formatFullPrice } from "@/lib/format";
import { getAreaBySlug } from "@/modules/areas/queries";
import {
  listingTypeLabels,
  propertyTypeLabels,
} from "@/modules/properties/constants";
import {
  getAllProperties,
  getPropertyBySlug,
  getRelatedProperties,
} from "@/modules/properties/queries";

interface PropertyPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllProperties().map((property) => ({ slug: property.slug }));
}

export async function generateMetadata({
  params,
}: PropertyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = getPropertyBySlug(slug);

  if (!property) {
    return { title: "Property not found" };
  }

  return {
    title: property.title,
    description: property.summary,
    openGraph: {
      title: property.title,
      description: property.summary,
      url: `/properties/${property.slug}`,
    },
  };
}

export default async function PropertyDetailPage({
  params,
}: PropertyPageProps) {
  const { slug } = await params;
  const property = getPropertyBySlug(slug);

  if (!property) {
    notFound();
  }

  const area = getAreaBySlug(property.areaSlug);
  const relatedProperties = getRelatedProperties(property, 3);

  const facts = [
    {
      label: "Property type",
      value: propertyTypeLabels[property.type],
      icon: Building2,
    },
    {
      label: "Bedrooms",
      value: property.bedrooms !== null ? `${property.bedrooms} BHK` : "—",
      icon: BedDouble,
    },
    {
      label: "Bathrooms",
      value: property.bathrooms !== null ? `${property.bathrooms}` : "—",
      icon: Bath,
    },
    {
      label: "Built-up area",
      value: formatArea(property.builtUpAreaSqft),
      icon: Maximize2,
    },
  ];

  return (
    <Container className="py-10 sm:py-14">
      <Link
        href="/properties"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All properties
      </Link>

      <div className="mt-7">
        <Notice>
          This is a sample listing for interface development. Property photos,
          documents, and verified details will be added with the live data layer.
        </Notice>
      </div>

      <header className="mt-8 border-b border-border pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {listingTypeLabels[property.listingType]}
          </Badge>
          <Badge variant="outline">
            {propertyTypeLabels[property.type]}
          </Badge>
          <PropertyStatusBadge status={property.status} />
        </div>

        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl leading-[1.1] tracking-tight text-foreground sm:text-5xl">
              {property.title}
            </h1>
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin aria-hidden="true" className="size-4 text-primary" />
              {property.locality}, Chennai
              {area ? (
                <>
                  <span aria-hidden="true">·</span>
                  <Link
                    href={`/areas/${area.slug}`}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Explore {area.name}
                  </Link>
                </>
              ) : null}
            </p>
          </div>
          <div className="shrink-0">
            <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {property.listingType === "rent" ? "Monthly rent" : "Guide price"}
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
              {formatFullPrice(property.price, property.listingType)}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-10">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-border bg-secondary">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(30,77,58,0.12),transparent_55%)]"
            />
            <div
              aria-hidden="true"
              className="absolute -right-16 -bottom-20 size-80 rounded-full border border-primary/10"
            />
            <div
              aria-hidden="true"
              className="absolute right-16 bottom-10 size-40 rounded-full border border-primary/10"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <Building2
                aria-hidden="true"
                strokeWidth={1}
                className="size-14 text-primary/30"
              />
              <p className="mt-4 text-sm font-medium text-foreground">
                Property photography placeholder
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Photos will be added with the live listing.
              </p>
            </div>
          </div>

          <section aria-labelledby="about-property">
            <h2
              id="about-property"
              className="text-xl font-semibold tracking-tight text-foreground"
            >
              About this property
            </h2>
            <div className="mt-4 space-y-4">
              {property.description.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-sm leading-relaxed text-muted-foreground sm:text-base"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </section>

          <section aria-labelledby="property-details">
            <h2
              id="property-details"
              className="text-xl font-semibold tracking-tight text-foreground"
            >
              Property details
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {facts.map((fact) => (
                <div
                  key={fact.label}
                  className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                    <fact.icon aria-hidden="true" className="size-4" />
                  </span>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {fact.label}
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold text-foreground">
                      {fact.value}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays aria-hidden="true" className="size-3.5" />
              Listed on {formatDate(property.listedAt)}
            </p>
          </section>

          <section aria-labelledby="property-features">
            <h2
              id="property-features"
              className="text-xl font-semibold tracking-tight text-foreground"
            >
              Features
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {property.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2.5 text-sm text-muted-foreground"
                >
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-primary"
                  />
                  {feature}
                </li>
              ))}
            </ul>
          </section>

          {area ? (
            <section aria-labelledby="area-context">
              <h2
                id="area-context"
                className="text-xl font-semibold tracking-tight text-foreground"
              >
                About {area.name}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {area.description}
              </p>
              <ul className="mt-4 space-y-2">
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
              <Button asChild variant="outline" size="sm" className="mt-5">
                <Link href={`/areas/${area.slug}`}>
                  View properties in {area.name}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <Card className="gap-5 p-6">
            <div>
              <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                {property.listingType === "rent" ? "Monthly rent" : "Guide price"}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {formatFullPrice(property.price, property.listingType)}
              </p>
            </div>

            <div className="rounded-lg bg-muted/60 p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  CRE
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Chennai Real Estates
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Single-broker platform
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Speak directly with the broker handling this listing. No call
                centres, no hand-offs.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href={siteConfig.links.contact}>
                  <UserRound aria-hidden="true" />
                  Enquire about this property
                </Link>
              </Button>
              <Button asChild variant="outline">
                <a href={siteConfig.contact.phoneHref}>
                  <Phone aria-hidden="true" />
                  {siteConfig.contact.phoneLabel}
                </a>
              </Button>
              <Button asChild variant="ghost">
                <a href={siteConfig.contact.emailHref}>
                  <Mail aria-hidden="true" />
                  {siteConfig.contact.email}
                </a>
              </Button>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Reference: {property.id.toUpperCase()} · Updated{" "}
              {formatDate(property.updatedAt)}
            </p>
          </Card>

          <Notice>
            Contact details and this listing are placeholders for the foundation
            build.
          </Notice>
        </aside>
      </div>

      {relatedProperties.length > 0 ? (
        <section aria-labelledby="related-properties" className="mt-16 border-t border-border pt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2
              id="related-properties"
              className="font-display text-3xl tracking-tight text-foreground"
            >
              You may also like
            </h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/properties">
                View all properties
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <PropertyGrid className="mt-8" properties={relatedProperties} />
        </section>
      ) : null}
    </Container>
  );
}
