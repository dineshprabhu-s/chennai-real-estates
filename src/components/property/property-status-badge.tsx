import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import { propertyStatusLabels } from "@/modules/properties/constants";
import type { PropertyStatus } from "@/types/property";

const statusVariants: Record<
  PropertyStatus,
  ComponentProps<typeof Badge>["variant"]
> = {
  available: "success",
  "under-offer": "warning",
  sold: "secondary",
  draft: "outline",
  unavailable: "destructive",
  expired: "outline",
};

interface PropertyStatusBadgeProps {
  status: PropertyStatus;
}

export function PropertyStatusBadge({ status }: PropertyStatusBadgeProps) {
  return <Badge variant={statusVariants[status]}>{propertyStatusLabels[status]}</Badge>;
}
