import type { DatabaseNumeric } from "@/lib/supabase/database.types";
import type { LeadActivity, LeadSource, LeadStatus } from "@/types/lead";
import type {
  ApprovalStatus, BrokerageType, Facing, FurnishingStatus, ListingType,
  Property, PropertyConfiguration, PropertyStatus, PropertyType, VerificationStatus,
} from "@/types/property";

/** Broker-only projection. Never pass this row or its mapped private data to a Client Component. */
export interface BrokerPropertyRow {
  id: string; slug: string; title: string; summary: string;
  description: string[]; public_description: string[]; type: PropertyType;
  configuration: PropertyConfiguration | null; listing_type: ListingType;
  status: PropertyStatus; price: DatabaseNumeric; price_negotiable: boolean;
  bedrooms: number | null; bathrooms: number | null;
  built_up_area_sqft: DatabaseNumeric | null; carpet_area_sqft: DatabaseNumeric | null;
  uds_sqft: DatabaseNumeric | null; floor: string | null; facing: Facing | null;
  building_age_years: number | null; has_lift: boolean | null; parking: string | null;
  furnishing: FurnishingStatus | null; approval_status: ApprovalStatus | null;
  brokerage: string | null; brokerage_type: BrokerageType | null;
  brokerage_value: DatabaseNumeric | null; availability_note: string | null;
  landmark: string | null; address: string | null; total_floors: number | null;
  security_deposit: DatabaseNumeric | null; last_verified_at: string | null;
  area_slug: string; locality: string; features: string[]; is_featured: boolean;
  verification_status: VerificationStatus; whatsapp_reference: string | null;
  listed_at: string; updated_at: string;
}

/** description is private; publicDescription is independently authored public text. */
export interface BrokerProperty extends Property {
  publicDescription: string[];
}

/** Smallest area shape needed for broker property form options. */
export interface BrokerAreaOption {
  slug: string;
  name: string;
  isActive: boolean;
}

/** Broker-only projection of a lead. Contains customer PII; server-side only. */
export interface BrokerLeadRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string;
  property_id: string | null;
  customer_id: string | null;
  customers: {
    name: string;
    phone: string;
    email: string | null;
  } | null;
  status: LeadStatus;
  created_at: string;
  source: LeadSource | null;
  is_demo: boolean;
  updated_at: string;
}

/** `lead_notes.id` is a bigint identity; PostgREST may return a number or string. */
export interface BrokerLeadNoteRow {
  id: number | string;
  lead_id: string;
  body: string;
  created_at: string;
}

export interface BrokerLeadActivityRow {
  id: string;
  lead_id: string;
  occurred_at: string;
  label: string;
  detail: string | null;
}

/** Notes have no author column, so the UI must not imply one. */
export interface BrokerLeadNote {
  id: string;
  body: string;
  createdAt: string;
}

/**
 * Application model used by the broker inbox and dashboard. It extends the
 * demo lead shape with structured database notes and broker-only timestamps.
 */
export interface BrokerLead {
  id: string;
  /** Current customer record when the enquiry has been linked to one. */
  customerId: string | null;
  name: string;
  phone: string;
  email: string | null;
  message: string;
  propertyId: string | null;
  status: LeadStatus;
  createdAt: string;
  source: LeadSource | null;
  isDemo: boolean;
  updatedAt: string;
  notes: BrokerLeadNote[];
  activities: LeadActivity[];
}

/** Only fields the leads inbox needs to resolve and link a property. */
export interface BrokerPropertyOption {
  id: string;
  title: string;
  locality: string;
  status: PropertyStatus;
}

export interface BrokerLeadStats extends Record<LeadStatus, number> {
  total: number;
  pending: number;
  scheduledVisits: number;
}

/**
 * Explicit inbox window. `total` is the full number of matching rows and
 * `hasMore` reports whether the window is incomplete.
 */
export interface BrokerLeadInbox {
  leads: BrokerLead[];
  total: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Row shape of `public.broker_customer_summary`. Aggregate counts come back
 * from PostgREST as either numbers or strings, so the mapper coerces them.
 */
export interface BrokerCustomerSummaryRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  normalized_phone: string;
  created_at: string;
  updated_at: string;
  enquiry_count: number | string;
  active_enquiry_count: number | string;
  latest_enquiry_at: string | null;
  is_demo: boolean;
  latest_activity_label: string | null;
  latest_activity_at: string | null;
}

/** Broker-only customer projection. Server-side only; never cached across requests. */
export interface BrokerCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  normalizedPhone: string;
  createdAt: string;
  updatedAt: string;
  enquiryCount: number;
  activeEnquiryCount: number;
  latestEnquiryAt: string | null;
  latestActivityLabel: string | null;
  latestActivityAt: string | null;
  isDemo: boolean;
}

/** A customer plus every linked enquiry, newest first. */
export interface BrokerCustomerDetail extends BrokerCustomer {
  enquiries: BrokerLead[];
}

export interface BrokerCustomerStats {
  total: number;
  withActiveEnquiries: number;
  repeatCustomers: number;
  newLast30Days: number;
}

export type BrokerCustomerSort =
  | "recent-enquiry"
  | "recent-activity"
  | "name"
  | "newest";

export interface BrokerCustomerPageFilters {
  page: number;
  query: string;
  sort: BrokerCustomerSort;
}

export interface BrokerCustomerPage {
  customers: BrokerCustomer[];
  page: number;
  pageSize: number;
  matchingTotal: number;
  total: number;
}
