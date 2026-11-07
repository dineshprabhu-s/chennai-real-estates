import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import {
  adminPropertyStatusLabels,
  approvalStatusLabels,
  verificationStatusLabels,
} from "@/modules/properties/constants";
import { leadStatusLabels } from "@/modules/leads/constants";
import type { LeadStatus } from "@/types/lead";
import type {
  ApprovalStatus,
  PropertyStatus,
  VerificationStatus,
} from "@/types/property";

const propertyStatusVariants: Record<
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

export function AdminPropertyStatusBadge({
  status,
}: {
  status: PropertyStatus;
}) {
  return (
    <Badge variant={propertyStatusVariants[status]}>
      {adminPropertyStatusLabels[status]}
    </Badge>
  );
}

const leadStatusVariants: Record<
  LeadStatus,
  ComponentProps<typeof Badge>["variant"]
> = {
  new: "warning",
  contacted: "outline",
  "visit-scheduled": "secondary",
  negotiation: "default",
  converted: "success",
  "closed-lost": "outline",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant={leadStatusVariants[status]}>
      {leadStatusLabels[status]}
    </Badge>
  );
}

export function VerificationBadge({
  status = "sample",
}: {
  status?: VerificationStatus;
}) {
  return (
    <Badge variant={status === "broker-confirmed" ? "success" : "warning"}>
      {verificationStatusLabels[status]}
    </Badge>
  );
}

export function ApprovalBadge({ status }: { status?: ApprovalStatus }) {
  if (!status) {
    return null;
  }

  return (
    <Badge variant={status === "approved" ? "success" : "outline"}>
      {approvalStatusLabels[status]}
    </Badge>
  );
}

export function DemoDataBadge() {
  return <Badge variant="outline">Demo data</Badge>;
}
