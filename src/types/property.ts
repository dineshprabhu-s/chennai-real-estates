export type PropertyType =
  | "apartment"
  | "independent-house"
  | "villa"
  | "plot";

export type PropertyConfiguration =
  | "1-rk"
  | "1-bhk"
  | "2-bhk"
  | "3-bhk"
  | "4-bhk";

export type ListingType = "sale" | "rent" | "lease";

export type PropertyStatus =
  | "available"
  | "under-offer"
  | "sold"
  | "draft"
  | "unavailable"
  | "expired";

export type Facing =
  | "north"
  | "south"
  | "east"
  | "west"
  | "north-east"
  | "north-west"
  | "south-east"
  | "south-west";

export type FurnishingStatus =
  | "unfurnished"
  | "semi-furnished"
  | "furnished";

export type ApprovalStatus = "approved" | "unapproved" | "not-applicable";

export type BrokerageType = "percentage" | "fixed" | "none";

/** Sample entries remain visibly unverified until the broker confirms them. */
export type VerificationStatus = "sample" | "broker-confirmed";

export interface Property {
  /** Permanent public identifier. Never reuse a WhatsApp reference here. */
  id: string;
  slug: string;
  title: string;
  /** Short one-line summary used on cards and metadata. */
  summary: string;
  /** Paragraphs rendered on the property detail page. */
  description: string[];
  /** Broad structural category, e.g. apartment or plot. */
  type: PropertyType;
  /** Unit configuration, e.g. 2 BHK or 1 RK. */
  configuration: PropertyConfiguration | null;
  listingType: ListingType;
  status: PropertyStatus;
  price: number;
  priceNegotiable?: boolean;
  bedrooms: number | null;
  bathrooms: number | null;
  /** Leave null when the source listing does not provide an area. */
  builtUpAreaSqft: number | null;
  carpetAreaSqft?: number;
  udsSqft?: number;
  floor?: string;
  facing?: Facing;
  buildingAgeYears?: number;
  hasLift?: boolean;
  parking?: string;
  furnishing?: FurnishingStatus;
  approvalStatus?: ApprovalStatus;
  /** Human-readable brokerage terms exactly as supplied by the broker. */
  brokerage?: string;
  /** Structured brokerage details used by the admin form preview. */
  brokerageType?: BrokerageType;
  brokerageValue?: string;
  /** Availability wording supplied with the listing, e.g. Ready to move. */
  availabilityNote?: string;
  landmark?: string;
  /** Fuller address used in the admin workspace. */
  address?: string;
  totalFloors?: number;
  securityDeposit?: number;
  /** ISO date of the broker's most recent verification. */
  lastVerifiedAt?: string;
  areaSlug: string;
  /** Display label for the area, e.g. "Madipakkam". */
  locality: string;
  features: string[];
  isFeatured: boolean;
  verificationStatus?: VerificationStatus;
  /** Original WhatsApp reference, kept separate from the permanent ID. */
  whatsappReference?: string;
  listedAt: string;
  updatedAt: string;
}
