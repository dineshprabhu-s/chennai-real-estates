import {
  ArrowRight,
  Bath,
  BedDouble,
  Building2,
  Compass,
  MapPin,
  Maximize2,
} from "lucide-react";
import Link from "next/link";

import { PropertyIllustration } from "@/components/property/property-illustration";
import { PropertyStatusBadge } from "@/components/property/property-status-badge";
import { WhatsAppEnquiryButton } from "@/components/property/whatsapp-enquiry-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatArea, formatPrice } from "@/lib/format";
import {
  facingLabels,
  getListingPriceLabel,
  listingTypeLabels,
  propertyConfigurationLabels,
  propertyTypeLabels,
} from "@/modules/properties/constants";
import type { Property } from "@/types/property";

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const configurationLabel = property.configuration
    ? propertyConfigurationLabels[property.configuration]
    : null;

  return (
    <Card className="group h-full gap-0 overflow-hidden p-0 transition-colors hover:border-primary/35">
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <Link
          href={`/properties/${property.slug}`}
          aria-label={`View details for ${property.title}`}
          className="absolute inset-0 block"
        >
          <PropertyIllustration
            type={property.type}
            className="size-full"
            label="Illustration"
          />
        </Link>

        <div className="pointer-events-none absolute inset-x-4 top-4 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {propertyTypeLabels[property.type]}
            </Badge>
            {property.isFeatured ? <Badge>Featured</Badge> : null}
            {property.approvalStatus === "unapproved" ? (
              <Badge variant="destructive">Unapproved</Badge>
            ) : null}
          </div>
          <PropertyStatusBadge status={property.status} />
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
          <span className="font-mono font-medium tracking-wide text-foreground">
            {property.id}
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <MapPin aria-hidden="true" className="size-3.5" />
            {property.locality}
          </span>
        </div>

        <div>
          <Link
            href={`/properties/${property.slug}`}
            className="rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
          >
            <h3 className="line-clamp-2 text-base leading-snug font-semibold text-foreground transition-colors group-hover:text-primary">
              {property.title}
            </h3>
          </Link>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {property.summary}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {property.bedrooms !== null ? (
            <span className="inline-flex items-center gap-1.5">
              <BedDouble aria-hidden="true" className="size-4" />
              {property.bedrooms} bed
            </span>
          ) : configurationLabel ? (
            <span className="inline-flex items-center gap-1.5">
              <BedDouble aria-hidden="true" className="size-4" />
              {configurationLabel}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Building2 aria-hidden="true" className="size-4" />
              {propertyTypeLabels[property.type]}
            </span>
          )}

          {property.bathrooms !== null ? (
            <span className="inline-flex items-center gap-1.5">
              <Bath aria-hidden="true" className="size-4" />
              {property.bathrooms} bath
            </span>
          ) : null}

          {property.builtUpAreaSqft !== null ? (
            <span className="inline-flex items-center gap-1.5">
              <Maximize2 aria-hidden="true" className="size-4" />
              {formatArea(property.builtUpAreaSqft)}
            </span>
          ) : null}

          {property.facing ? (
            <span className="inline-flex items-center gap-1.5">
              <Compass aria-hidden="true" className="size-4" />
              {facingLabels[property.facing]}
            </span>
          ) : null}
        </div>

        <div className="mt-auto border-t border-border pt-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium tracking-[0.13em] text-muted-foreground uppercase">
                {getListingPriceLabel(property.listingType)}
              </p>
              <p className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">
                {formatPrice(property.price, property.listingType)}
              </p>
              {property.priceNegotiable ? (
                <p className="mt-0.5 text-[11px] font-medium text-primary">
                  Negotiable
                </p>
              ) : null}
            </div>
            <span className="pb-0.5 text-xs font-medium text-muted-foreground">
              {listingTypeLabels[property.listingType]}
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href={`/properties/${property.slug}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              View details
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <WhatsAppEnquiryButton
              property={property}
              label="WhatsApp"
              fallbackLabel="Enquire"
              className="sm:ml-auto"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
