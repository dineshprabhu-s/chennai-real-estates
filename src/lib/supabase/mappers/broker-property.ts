import "server-only";

import type { BrokerProperty, BrokerPropertyRow } from "@/lib/supabase/broker.types";
import type { DatabaseNumeric } from "@/lib/supabase/database.types";

/**
 * PostgreSQL columns have scale 2 and at most 14 digits. Check that converting
 * a decimal string to an IEEE-754 number does not change its value at that
 * scale. If PostgREST already returned a JSON number, its original text or any
 * precision lost during JSON parsing cannot be recovered.
 */
function numeric(value: DatabaseNumeric, column: string, precision: 10 | 14): number {
  const text = String(value);
  const match = /^([+-]?)(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match || match[2]!.replace(/^0+/, "").length > precision - 2) {
    throw new Error(`Invalid numeric value in ${column}`);
  }
  const number = Number(text);
  if (!Number.isFinite(number)) throw new Error(`Invalid numeric value in ${column}`);
  const sign = match[1] === "-" ? BigInt(-1) : BigInt(1);
  const cents = sign * (BigInt(match[2]!) * BigInt(100) + BigInt((match[3] ?? "").padEnd(2, "0")));
  const fixed = number.toFixed(2);
  const fixedMatch = /^(-?)(\d+)\.(\d{2})$/.exec(fixed);
  if (!fixedMatch) throw new Error(`Invalid numeric value in ${column}`);
  const roundTrip = (fixedMatch[1] ? BigInt(-1) : BigInt(1)) * (BigInt(fixedMatch[2]!) * BigInt(100) + BigInt(fixedMatch[3]!));
  if (cents !== roundTrip) throw new Error(`Numeric precision loss in ${column}`);
  return number;
}

function optionalNumeric(value: DatabaseNumeric | null, column: string, precision: 10 | 14): number | undefined {
  return value === null ? undefined : numeric(value, column, precision);
}

/** Converts a broker row without merging or inferring private and public text. */
export function mapBrokerProperty(row: BrokerPropertyRow): BrokerProperty {
  let brokerageValue: string | undefined;
  if (row.brokerage_value !== null) {
    numeric(row.brokerage_value, "brokerage_value", 14);
    brokerageValue = String(row.brokerage_value);
  }
  return {
    id: row.id, slug: row.slug, title: row.title, summary: row.summary,
    description: row.description, publicDescription: row.public_description,
    type: row.type, configuration: row.configuration, listingType: row.listing_type,
    status: row.status, price: numeric(row.price, "price", 14),
    priceNegotiable: row.price_negotiable, bedrooms: row.bedrooms, bathrooms: row.bathrooms,
    builtUpAreaSqft: row.built_up_area_sqft === null ? null : numeric(row.built_up_area_sqft, "built_up_area_sqft", 10),
    carpetAreaSqft: optionalNumeric(row.carpet_area_sqft, "carpet_area_sqft", 10),
    udsSqft: optionalNumeric(row.uds_sqft, "uds_sqft", 10), floor: row.floor ?? undefined,
    facing: row.facing ?? undefined, buildingAgeYears: row.building_age_years ?? undefined,
    hasLift: row.has_lift ?? undefined, parking: row.parking ?? undefined,
    furnishing: row.furnishing ?? undefined, approvalStatus: row.approval_status ?? undefined,
    brokerage: row.brokerage ?? undefined, brokerageType: row.brokerage_type ?? undefined,
    brokerageValue, availabilityNote: row.availability_note ?? undefined,
    landmark: row.landmark ?? undefined, address: row.address ?? undefined,
    totalFloors: row.total_floors ?? undefined,
    securityDeposit: optionalNumeric(row.security_deposit, "security_deposit", 14),
    lastVerifiedAt: row.last_verified_at ?? undefined, areaSlug: row.area_slug,
    locality: row.locality, features: row.features, isFeatured: row.is_featured,
    verificationStatus: row.verification_status, whatsappReference: row.whatsapp_reference ?? undefined,
    listedAt: row.listed_at, updatedAt: row.updated_at,
  };
}
