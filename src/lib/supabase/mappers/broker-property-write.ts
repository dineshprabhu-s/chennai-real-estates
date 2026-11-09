import "server-only";

import { randomUUID } from "node:crypto";
import type { PropertyValidationResult, ValidatedPropertyFields } from "@/lib/supabase/validation/broker-property-input";

type ValidInput = Extract<PropertyValidationResult, { ok: true }>;
type WriteValue = string | boolean | number | string[] | null;
export type PropertyWrite = Record<string, WriteValue>;
const columns: Readonly<Record<string, string>> = {
  slug: "slug", title: "title", summary: "summary", description: "description", publicDescription: "public_description",
  type: "type", configuration: "configuration", listingType: "listing_type", status: "status", price: "price",
  priceNegotiable: "price_negotiable", bedrooms: "bedrooms", bathrooms: "bathrooms", builtUpAreaSqft: "built_up_area_sqft",
  carpetAreaSqft: "carpet_area_sqft", udsSqft: "uds_sqft", floor: "floor", facing: "facing",
  buildingAgeYears: "building_age_years", hasLift: "has_lift", parking: "parking", furnishing: "furnishing",
  approvalStatus: "approval_status", brokerage: "brokerage", brokerageType: "brokerage_type", brokerageValue: "brokerage_value",
  availabilityNote: "availability_note", landmark: "landmark", address: "address", totalFloors: "total_floors",
  securityDeposit: "security_deposit", lastVerifiedAt: "last_verified_at", areaSlug: "area_slug", locality: "locality",
  features: "features", isFeatured: "is_featured", verificationStatus: "verification_status",
  whatsappReference: "whatsapp_reference", listedAt: "listed_at",
};

function mapFields(fields: ValidatedPropertyFields): PropertyWrite {
  const result: PropertyWrite = {};
  for (const [key, value] of Object.entries(fields)) {
    const column = columns[key];
    if (!column) throw new Error("Invalid validated property field");
    result[column] = value;
  }
  return result;
}

/**
 * Availability must be checked server-side against all broker-visible rows.
 * The DB unique constraint remains authoritative for races at insert time.
 */
export async function mapBrokerPropertyCreate(
  input: ValidInput,
  isSlugAvailable: (slug: string) => Promise<boolean>,
): Promise<PropertyWrite> {
  if (input.operation !== "create") throw new Error("Validated creation input is required");
  const title = input.fields.title;
  if (typeof title !== "string") throw new Error("Validated creation title is required");
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "") || "property";
  const slug = `${base}-${randomUUID()}`;
  let available: boolean;
  try {
    available = await isSlugAvailable(slug);
  } catch {
    throw new Error("Unable to check property slug availability");
  }
  if (available !== true) throw new Error("Could not allocate a unique property slug");
  return { ...mapFields(input.fields), slug, status: input.intent === "draft" ? "draft" : "available" };
}

/** Only submitted fields and the explicitly selected action are changed. */
export function mapBrokerPropertyUpdate(input: ValidInput): PropertyWrite {
  if (input.operation !== "update") throw new Error("Validated update input is required");
  const fields = mapFields(input.fields);
  return input.intent === "preserve" ? fields : { ...fields, status: input.intent === "draft" ? "draft" : "available" };
}
