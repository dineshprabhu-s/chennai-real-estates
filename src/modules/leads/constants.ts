import type { LeadStatus } from "@/types/lead";

export const leadStatusLabels: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  closed: "Closed",
};

export const leadPipeline = [
  {
    status: "new",
    description: "Enquiries awaiting a first response.",
  },
  {
    status: "contacted",
    description: "Conversations already in progress.",
  },
  {
    status: "closed",
    description: "Enquiries that have run their course.",
  },
] satisfies ReadonlyArray<{ status: LeadStatus; description: string }>;
