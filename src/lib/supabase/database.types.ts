import type {
  ApprovalStatus, BrokerageType, Facing, FurnishingStatus, ListingType,
  PropertyConfiguration, PropertyStatus, PropertyType, VerificationStatus,
} from "@/types/property";

/** PostgREST normally returns JSON numbers; decimal strings are also accepted.
 * A number has already undergone JavaScript floating-point conversion. */
export type DatabaseNumeric = number | string;

/** Only the columns granted to anon and selected by public property queries. */
export interface PublicPropertyRow {
  id: string; slug: string; title: string; summary: string;
  public_description: string[]; type: PropertyType;
  configuration: PropertyConfiguration | null; listing_type: ListingType;
  status: PropertyStatus; price: DatabaseNumeric; price_negotiable: boolean;
  bedrooms: number | null; bathrooms: number | null;
  built_up_area_sqft: DatabaseNumeric | null; carpet_area_sqft: DatabaseNumeric | null;
  uds_sqft: DatabaseNumeric | null; floor: string | null; facing: Facing | null;
  building_age_years: number | null; has_lift: boolean | null; parking: string | null;
  furnishing: FurnishingStatus | null; approval_status: ApprovalStatus | null;
  brokerage: string | null; brokerage_type: BrokerageType | null;
  brokerage_value: DatabaseNumeric | null; availability_note: string | null;
  landmark: string | null; total_floors: number | null;
  security_deposit: DatabaseNumeric | null; last_verified_at: string | null;
  area_slug: string; locality: string; features: string[]; is_featured: boolean;
  verification_status: VerificationStatus; listed_at: string; updated_at: string;
}

/** The columns used by public area queries, excluding unused timestamps. */
export interface PublicAreaRow {
  slug: string; name: string; pincode: string; summary: string;
  description: string; highlights: string[]; parent_area: string | null;
  is_active: boolean;
}
