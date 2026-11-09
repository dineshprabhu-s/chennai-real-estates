import type { DatabaseNumeric } from "@/lib/supabase/database.types";
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
