export type LeadStatus =
  | "new"
  | "contacted"
  | "visit-scheduled"
  | "negotiation"
  | "converted"
  | "closed-lost";

export type LeadSource =
  | "website-form"
  | "property-enquiry"
  | "whatsapp"
  | "phone";

export interface LeadActivity {
  id: string;
  at: string;
  label: string;
  detail?: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string;
  propertyId: string | null;
  status: LeadStatus;
  createdAt: string;
  source?: LeadSource;
  /** Seeded example data is always shown with an explicit demo label. */
  isDemo?: boolean;
  notes?: string[];
  activities?: LeadActivity[];
}
