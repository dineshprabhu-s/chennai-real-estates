import type { LeadSource, LeadStatus } from "@/types/lead";

export const leadStatusLabels: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  "visit-scheduled": "Visit scheduled",
  negotiation: "Negotiation",
  converted: "Converted",
  "closed-lost": "Closed / lost",
};

export const leadStatusOptions: ReadonlyArray<{
  value: LeadStatus;
  label: string;
}> = [
  { value: "new", label: leadStatusLabels.new },
  { value: "contacted", label: leadStatusLabels.contacted },
  { value: "visit-scheduled", label: leadStatusLabels["visit-scheduled"] },
  { value: "negotiation", label: leadStatusLabels.negotiation },
  { value: "converted", label: leadStatusLabels.converted },
  { value: "closed-lost", label: leadStatusLabels["closed-lost"] },
];

export const leadSourceLabels: Record<LeadSource, string> = {
  "website-form": "Website form",
  "property-enquiry": "Property enquiry",
  whatsapp: "WhatsApp",
  phone: "Phone",
};

export const leadStatsOrder: ReadonlyArray<{
  status: LeadStatus;
  description: string;
}> = [
  {
    status: "new",
    description: "Enquiries awaiting a first response.",
  },
  {
    status: "contacted",
    description: "Conversations already in progress.",
  },
  {
    status: "visit-scheduled",
    description: "Customers with a property visit arranged.",
  },
  {
    status: "negotiation",
    description: "Active discussions about price or terms.",
  },
  {
    status: "converted",
    description: "Enquiries that became a completed deal.",
  },
  {
    status: "closed-lost",
    description: "Enquiries that did not proceed.",
  },
];

/**
 * @deprecated Use leadStatsOrder. Kept briefly for the old pipeline import.
 */
export const leadPipeline = leadStatsOrder;
