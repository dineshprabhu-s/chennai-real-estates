import {
  ArrowRight,
  Bath,
  BedDouble,
  Building2,
  MapPin,
  Maximize2,
} from "lucide-react";
import Link from "next/link";

import { PropertyStatusBadge } from "@/components/property/property-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatArea,
  formatPrice,
} from "@/lib/format";
import {
  listingTypeLabels,
  propertyTypeLabels,
} from "@/modules/properties/constants";
import type { Property } from "@/types/property";

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  return (
    <Link
      href={`/properties/${property.slug}`}
      className="group block h-full rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
    >
      <Card className="h-full gap-0 overflow-hidden p-0 transition-colors group-hover:border-primary/35">
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(30,77,58,0.12),transparent_55%)]"
          />
          <div
            aria-hidden="true"
            className="absolute -right-8 -bottom-10 size-44 rounded-full border border-primary/10"
          />
          <div
            aria-hidden="true"
            className="absolute right-10 bottom-8 size-24 rounded-full border border-primary/10"
          />
          <Building2
            aria-hidden="true"
            strokeWidth={1}
            className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 text-primary/25"
          />
          <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {propertyTypeLabels[property.type]}
              </Badge>
              {property.isFeatured ? <Badge>Featured</Badge> : null}
            </div>
            <PropertyStatusBadge status={property.status} />
          </div>
        </div>

        <CardContent className="flex flex-1 flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="size-3.5" />
              {property.locality}
            </span>
            <span aria-hidden="true">·</span>
            <span>{listingTypeLabels[property.listingType]}</span>
          </div>

          <div>
            <h3 className="line-clamp-2 text-base leading-snug font-semibold text-foreground transition-colors group-hover:text-primary">
              {property.title}
            </h3>
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {property.summary}
            </p>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
            {property.bedrooms !== null ? (
              <span className="inline-flex items-center gap-1.5">
                <BedDouble aria-hidden="true" className="size-4" />
                {property.bedrooms} BHK
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
            <span className="inline-flex items-center gap-1.5">
              <Maximize2 aria-hidden="true" className="size-4" />
              {formatArea(property.builtUpAreaSqft)}
            </span>
          </div>

          <div className="flex items-end justify-between gap-3">
            <p className="text-lg font-semibold tracking-tight text-foreground">
              {formatPrice(property.price, property.listingType)}
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              View details
              <ArrowRight aria-hidden="true" className="size-4" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
