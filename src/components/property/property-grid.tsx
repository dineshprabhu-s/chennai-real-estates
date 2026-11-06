import { Building2 } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PropertyCard } from "@/components/property/property-card";
import { cn } from "@/lib/utils";
import type { Property } from "@/types/property";

interface PropertyGridProps {
  properties: Property[];
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function PropertyGrid({
  properties,
  emptyTitle = "No properties to show yet",
  emptyDescription = "New listings will appear here once they are published.",
  className,
}: PropertyGridProps) {
  if (properties.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div
      className={cn(
        "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
