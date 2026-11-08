import type { DatabaseNumeric, PublicPropertyRow } from "@/lib/supabase/database.types";
import type { Property } from "@/types/property";

// The schema uses numeric(14,2) or numeric(10,2). Numbers in the domain are
// IEEE-754 approximations; the original decimal text cannot be recovered if
// JSON has already parsed it as a number. Reject malformed/non-finite values.
function numeric(value: DatabaseNumeric, column: string): number {
  if (typeof value === "string" && !/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)) {
    throw new Error(`Invalid numeric value in ${column}`);
  }
  const result = Number(value);
  if (!Number.isFinite(result)) throw new Error(`Invalid numeric value in ${column}`);
  return result;
}

function optionalNumeric(value: DatabaseNumeric | null, column: string): number | undefined {
  return value === null ? undefined : numeric(value, column);
}

export function mapPublicProperty(row: PublicPropertyRow): Property {
  // Keep decimal strings as received, including significant trailing zeros.
  // If the transport returned a number, its original formatting is unavailable.
  const brokerageValue = row.brokerage_value === null ? undefined : (() => {
    numeric(row.brokerage_value, "brokerage_value");
    return String(row.brokerage_value);
  })();

  return {
    id: row.id, slug: row.slug, title: row.title, summary: row.summary,
    description: row.public_description, type: row.type, configuration: row.configuration,
    listingType: row.listing_type, status: row.status, price: numeric(row.price, "price"),
    priceNegotiable: row.price_negotiable, bedrooms: row.bedrooms, bathrooms: row.bathrooms,
    builtUpAreaSqft: row.built_up_area_sqft === null ? null : numeric(row.built_up_area_sqft, "built_up_area_sqft"),
    carpetAreaSqft: optionalNumeric(row.carpet_area_sqft, "carpet_area_sqft"),
    udsSqft: optionalNumeric(row.uds_sqft, "uds_sqft"), floor: row.floor ?? undefined,
    facing: row.facing ?? undefined, buildingAgeYears: row.building_age_years ?? undefined,
    hasLift: row.has_lift ?? undefined, parking: row.parking ?? undefined,
    furnishing: row.furnishing ?? undefined, approvalStatus: row.approval_status ?? undefined,
    brokerage: row.brokerage ?? undefined, brokerageType: row.brokerage_type ?? undefined,
    brokerageValue, availabilityNote: row.availability_note ?? undefined,
    landmark: row.landmark ?? undefined, totalFloors: row.total_floors ?? undefined,
    securityDeposit: optionalNumeric(row.security_deposit, "security_deposit"),
    lastVerifiedAt: row.last_verified_at ?? undefined, areaSlug: row.area_slug,
    locality: row.locality, features: row.features, isFeatured: row.is_featured,
    verificationStatus: row.verification_status, listedAt: row.listed_at, updatedAt: row.updated_at,
  };
}
