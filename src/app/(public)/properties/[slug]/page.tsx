import {
  ArrowLeft,
  ArrowRight,
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  Check,
  Compass,
  Mail,
  MapPin,
  Maximize2,
  Phone,
  TriangleAlert,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { Container } from "@/components/common/container";
import { Notice } from "@/components/common/notice";
import { ContactForm } from "@/components/forms/contact-form";
import { PropertyGallery } from "@/components/property/property-gallery";
import { PropertyGrid } from "@/components/property/property-grid";
import { PropertyStatusBadge } from "@/components/property/property-status-badge";
import { WhatsAppEnquiryButton } from "@/components/property/whatsapp-enquiry-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import {
  formatArea,
  formatDate,
  formatFullPrice,
} from "@/lib/format";
import { getPublicAreaBySlug } from "@/lib/supabase/queries/areas";
import {
  approvalStatusLabels,
  facingLabels,
  furnishingLabels,
  getListingPriceLabel,
  listingTypeLabels,
  propertyConfigurationLabels,
  propertyStatusLabels,
  propertyTypeLabels,
} from "@/modules/properties/constants";
import {
  getPublicPropertyBySlug,
  getPublicPropertiesByArea,
} from "@/lib/supabase/queries/properties";

export const instant = false;

interface PropertyPageProps {
  params: Promise<{ slug: string }>;
}

interface QuickFact {
  label: string;
  value: string;
  icon: LucideIcon;
}

export async function generateMetadata({
  params,
}: PropertyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPublicPropertyBySlug(slug);

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
  const property = await getPublicPropertyBySlug(slug);

  if (!property) {
    notFound();
  }

  const [area, areaProperties] = await Promise.all([
    getPublicAreaBySlug(property.areaSlug),
    getPublicPropertiesByArea(property.areaSlug),
  ]);
  const relatedProperties = areaProperties
    .filter((candidate) => candidate.id !== property.id)
    .sort((a, b) =>
      Number(b.type === property.type) - Number(a.type === property.type) ||
      b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id),
    )
    .slice(0, 3);
  const isUnapproved = property.approvalStatus === "unapproved";
  const configurationLabel = property.configuration
    ? propertyConfigurationLabels[property.configuration]
    : null;

  const quickFacts: QuickFact[] = [
    {
      label: "Property category",
      value: propertyTypeLabels[property.type],
      icon: Building2,
    },
  ];

  if (configurationLabel) {
    quickFacts.push({
      label: "Property type",
      value: configurationLabel,
      icon: BedDouble,
    });
  }

  if (property.bedrooms !== null) {
    quickFacts.push({
      label: "Bedrooms",
      value: `${property.bedrooms}`,
      icon: BedDouble,
    });
  }

  if (property.bathrooms !== null) {
    quickFacts.push({
      label: "Bathrooms",
      value: `${property.bathrooms}`,
      icon: Bath,
    });
  }

  if (property.builtUpAreaSqft !== null) {
    quickFacts.push({
      label: property.type === "plot" ? "Plot area" : "Built-up area",
      value: formatArea(property.builtUpAreaSqft),
      icon: Maximize2,
    });
  }

  if (property.facing) {
    quickFacts.push({
      label: "Facing",
      value: facingLabels[property.facing],
      icon: Compass,
    });
  }

  const detailRows: Array<{ label: string; value: string }> = [];

  if (property.carpetAreaSqft !== undefined) {
    detailRows.push({
      label: "Carpet area",
      value: formatArea(property.carpetAreaSqft),
    });
  }

  if (property.udsSqft !== undefined) {
    detailRows.push({ label: "UDS", value: formatArea(property.udsSqft) });
  }

  if (property.floor) {
    detailRows.push({ label: "Floor", value: property.floor });
  }

  if (property.buildingAgeYears !== undefined) {
    detailRows.push({
      label: "Building age",
      value: `${property.buildingAgeYears} years`,
    });
  }

  if (property.hasLift !== undefined) {
    detailRows.push({
      label: "Lift",
      value: property.hasLift ? "Available" : "Not available",
    });
  }

  if (property.parking) {
    detailRows.push({ label: "Parking", value: property.parking });
  }

  if (property.furnishing) {
    detailRows.push({
      label: "Furnishing",
      value: furnishingLabels[property.furnishing],
    });
  }

  if (property.approvalStatus) {
    detailRows.push({
      label: "Approval status",
      value: approvalStatusLabels[property.approvalStatus],
    });
  }

  detailRows.push({
    label: "Availability",
    value:
      property.availabilityNote ?? propertyStatusLabels[property.status],
  });

  if (property.brokerage) {
    detailRows.push({ label: "Brokerage", value: property.brokerage });
  }

  return (
    <Container className="py-10 sm:py-14">
      <Link
        href="/properties"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All properties
      </Link>

      {isUnapproved ? (
        <div
          role="alert"
          className="mt-7 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
        >
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-destructive"
          />
          <div>
            <p className="text-sm font-semibold text-destructive">
              Unapproved property
            </p>
            <p className="mt-1 text-sm leading-relaxed text-foreground/80">
              This listing is marked as unapproved. Do not treat the property as
              approved or assume clear documentation. Verify the approval status,
              plans, and documents directly with the broker and the relevant
              authority before proceeding.
            </p>
          </div>
        </div>
      ) : null}

      <Notice className="mt-6">
        {property.verificationStatus === "sample" ? (
          <>
            <strong className="font-semibold text-foreground">
              Sample, unverified listing.
            </strong>{" "}
            Property ID {property.id}. Confirm current
            availability, price, measurements, and approval details before
            acting on it.
          </>
        ) : (
          <>
            Confirm current availability, price, measurements, and approval
            details with the broker before acting on this listing.
          </>
        )}
      </Notice>

      <header className="mt-8 border-b border-border pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {listingTypeLabels[property.listingType]}
          </Badge>
          <Badge variant="outline">
            {propertyTypeLabels[property.type]}
          </Badge>
          {configurationLabel ? (
            <Badge variant="outline">{configurationLabel}</Badge>
          ) : null}
          <PropertyStatusBadge status={property.status} />
          {property.approvalStatus ? (
            <Badge
              variant={
                property.approvalStatus === "unapproved"
                  ? "destructive"
                  : property.approvalStatus === "approved"
                    ? "success"
                    : "outline"
              }
            >
              {approvalStatusLabels[property.approvalStatus]}
            </Badge>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-medium tracking-wide text-muted-foreground">
              Property ID {property.id}
            </p>
            <h1 className="mt-2 font-display text-4xl leading-[1.1] tracking-tight text-foreground sm:text-5xl">
              {property.title}
            </h1>
            <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <MapPin aria-hidden="true" className="size-4 text-primary" />
              <span>{property.locality}, Chennai</span>
              {property.landmark ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{property.landmark}</span>
                </>
              ) : null}
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
              {getListingPriceLabel(property.listingType)}
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
              {formatFullPrice(property.price, property.listingType)}
            </p>
            {property.priceNegotiable ? (
              <p className="mt-1 text-sm font-medium text-primary">Negotiable</p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="space-y-10">
          <PropertyGallery type={property.type} />

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
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {quickFacts.map((fact) => (
                <div
                  key={fact.label}
                  className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                    <fact.icon aria-hidden="true" className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">{fact.label}</p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">
                      {fact.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {detailRows.length > 0 ? (
              <dl className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {detailRows.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[1fr_1.4fr] sm:gap-4"
                  >
                    <dt className="text-xs text-muted-foreground">{row.label}</dt>
                    <dd className="text-sm font-medium text-foreground">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays aria-hidden="true" className="size-3.5" />
              Listed on {formatDate(property.listedAt)} · Updated{" "}
              {formatDate(property.updatedAt)}
            </p>
          </section>

          {property.features.length > 0 ? (
            <section aria-labelledby="property-features">
              <h2
                id="property-features"
                className="text-xl font-semibold tracking-tight text-foreground"
              >
                Features and notes
              </h2>
              <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          ) : null}

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

        <aside className="space-y-4">
          <Card className="gap-5 p-6">
            <div>
              <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                {getListingPriceLabel(property.listingType)}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {formatFullPrice(property.price, property.listingType)}
              </p>
              {property.priceNegotiable ? (
                <p className="mt-1 text-sm font-medium text-primary">
                  Negotiable
                </p>
              ) : null}
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
              <WhatsAppEnquiryButton
                property={property}
                label="Enquire on WhatsApp"
                fallbackLabel="Enquire about this property"
                fallbackHref="#enquiry-form"
                size="default"
                className="w-full"
              />
              <Button asChild variant="outline" className="w-full">
                <a href={siteConfig.contact.phoneHref}>
                  <Phone aria-hidden="true" />
                  {siteConfig.contact.phoneLabel}
                </a>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="h-auto min-h-9 w-full py-2 whitespace-normal break-all"
              >
                <a href={siteConfig.contact.emailHref}>
                  <Mail aria-hidden="true" />
                  {siteConfig.contact.email}
                </a>
              </Button>
            </div>

            <div
              id="enquiry-form"
              className="border-t border-border pt-5 scroll-mt-24"
            >
              <h2 className="font-display text-2xl tracking-tight text-foreground">
                Ask about this property
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Send an enquiry about this listing. The broker will use your
                details only to respond.
              </p>
              <ContactForm
                key={property.id}
                property={property}
                propertyId={property.id}
                compact
                className="mt-4"
              />
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Reference: {property.id} · Updated{" "}
              {formatDate(property.updatedAt)}
            </p>
          </Card>

          <Notice>
            Contact details are placeholders for the foundation build.
            Verify everything directly with the broker.
          </Notice>
        </aside>
      </div>

      {relatedProperties.length > 0 ? (
        <section
          aria-labelledby="related-properties"
          className="mt-16 border-t border-border pt-10"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2
                id="related-properties"
                className="font-display text-3xl tracking-tight text-foreground"
              >
                More properties in {area?.name ?? property.locality}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Similar listings from the same locality.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/properties?areaSlug=${property.areaSlug}`}>
                View all in this area
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
