export type LeadStatus = "new" | "contacted" | "closed";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string;
  propertyId: string | null;
  status: LeadStatus;
  createdAt: string;
}
