import "server-only";

import {
  approvalStatusOptions, brokerageTypeOptions, facingOptions, furnishingOptions,
  listingTypeOptions, propertyConfigurationOptions, propertyStatusOptions,
  propertyTypeOptions, verificationStatusOptions,
} from "@/modules/properties/constants";
import type { BrokerAreaOption, BrokerPropertyRow } from "@/lib/supabase/broker.types";

/** Inputs are untrusted. Callers supply only fields intentionally edited. */
export type PropertyIntent = "draft" | "publish" | "preserve";
type FieldValue = string | boolean | number | string[] | null;
export type ValidatedPropertyFields = Record<string, FieldValue>;
export type PropertyValidationResult =
  | { ok: true; operation: "create" | "update"; intent: PropertyIntent; fields: ValidatedPropertyFields }
  | { ok: false; errors: Record<string, string> };

const enums: Record<string, readonly { value: string }[]> = {
  type: propertyTypeOptions, configuration: propertyConfigurationOptions,
  listingType: listingTypeOptions, status: propertyStatusOptions,
  facing: facingOptions, furnishing: furnishingOptions, approvalStatus: approvalStatusOptions,
  brokerageType: brokerageTypeOptions, verificationStatus: verificationStatusOptions,
};
const nullable = new Set([
  "configuration", "bedrooms", "bathrooms", "builtUpAreaSqft", "carpetAreaSqft", "udsSqft",
  "floor", "facing", "buildingAgeYears", "hasLift", "parking", "furnishing", "approvalStatus",
  "brokerage", "brokerageType", "brokerageValue", "availabilityNote", "landmark", "address",
  "totalFloors", "securityDeposit", "lastVerifiedAt", "whatsappReference",
]);
const textFields = new Set(["slug", "title", "summary", "floor", "parking", "brokerage", "availabilityNote", "landmark", "address", "areaSlug", "locality", "whatsappReference"]);
const arrayFields = new Set(["description", "publicDescription", "features"]);
const boolFields = new Set(["priceNegotiable", "hasLift", "isFeatured"]);
const integers = new Set(["bedrooms", "bathrooms", "buildingAgeYears", "totalFloors"]);
const decimals: Record<string, 10 | 14> = {
  price: 14, builtUpAreaSqft: 10, carpetAreaSqft: 10, udsSqft: 10,
  brokerageValue: 14, securityDeposit: 14,
};
const dateFields = new Set(["lastVerifiedAt", "listedAt"]);
const fields = new Set([...textFields, ...arrayFields, ...boolFields, ...integers, ...Object.keys(decimals), ...dateFields, ...Object.keys(enums)]);
const requiredOnCreate = ["title", "summary", "description", "publicDescription", "type", "listingType", "price", "areaSlug", "locality", "listedAt"];

function validDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const year = Number(m[1]); const month = Number(m[2]); const day = Number(m[3]);
  if (year < 1 || month < 1 || month > 12) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= days[month - 1]!;
}

/** Validate decimal strings without converting to a floating point number. */
function decimal(value: unknown, precision: 10 | 14, positive: boolean): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match || match[1]!.replace(/^0+/, "").length > precision - 2) return null;
  if (positive && !/[1-9]/.test(value)) return null;
  return value;
}

/**
 * areas must be fetched authoritatively on the server for this request. Existing
 * is the complete broker DB row on edit, not client-supplied state. New area
 * selections must be active; an existing inactive relationship may be retained.
 */
export function validateBrokerPropertyInput(
  input: unknown,
  intent: unknown,
  context: { operation: "create" | "update"; areas: readonly BrokerAreaOption[]; existing?: BrokerPropertyRow },
): PropertyValidationResult {
  const errors: Record<string, string> = {};
  const result: ValidatedPropertyFields = {};
  if (intent !== "draft" && intent !== "publish" && !(intent === "preserve" && context.operation === "update")) errors.intent = "Choose a valid save action.";
  if (context.operation === "update" && !context.existing) errors.form = "The existing property is required.";
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, errors: { ...errors, form: "Enter valid property details." } };
  const source = input as Record<string, unknown>;
  for (const [key, value] of Object.entries(source)) {
    if (!fields.has(key)) { errors[key] = "This field cannot be changed."; continue; }
    if (key === "slug" && context.operation === "create") { errors.slug = "The slug is generated on creation."; continue; }
    if (value === null) {
      if (nullable.has(key)) result[key] = null;
      else errors[key] = "This field cannot be cleared.";
      continue;
    }
    if (arrayFields.has(key)) {
      if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) { errors[key] = "Enter a valid list of text."; continue; }
      if (key === "description" && value.length === 0) { errors[key] = "Add at least one private description paragraph."; continue; }
      result[key] = [...value]; continue;
    }
    if (boolFields.has(key)) {
      if (typeof value !== "boolean") errors[key] = "Choose a valid value.";
      else result[key] = value;
      continue;
    }
    if (integers.has(key)) {
      if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 32767) errors[key] = "Enter a whole number from 0 to 32767.";
      else result[key] = value;
      continue;
    }
    if (key in decimals) {
      const parsed = decimal(value, decimals[key]!, key === "price" || key === "builtUpAreaSqft");
      if (parsed === null) errors[key] = "Enter a valid amount within the allowed range and two decimal places.";
      else result[key] = parsed;
      continue;
    }
    if (dateFields.has(key)) {
      if (typeof value !== "string" || !validDate(value)) errors[key] = "Enter a valid date (YYYY-MM-DD).";
      else result[key] = value;
      continue;
    }
    if (key in enums) {
      if (typeof value !== "string" || !enums[key]!.some((option) => option.value === value)) errors[key] = "Choose a valid option.";
      else result[key] = value;
      continue;
    }
    if (textFields.has(key)) {
      if (typeof value !== "string") { errors[key] = "Enter valid text."; continue; }
      const trimmed = value.trim();
      if ((key === "title" && [...trimmed].length < 5) || (key === "summary" && [...trimmed].length < 10) || (["areaSlug", "locality"].includes(key) && !trimmed)) {
        errors[key] = "Enter a valid value."; continue;
      }
      if (key === "slug" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed)) { errors[key] = "Use lowercase letters, numbers, and single hyphens."; continue; }
      result[key] = trimmed; continue;
    }
  }
  if (context.operation === "create") {
    for (const key of requiredOnCreate) if (!Object.hasOwn(result, key) && !errors[key]) errors[key] = "This field is required.";
  }
  const areaSlug = result.areaSlug;
  if (typeof areaSlug === "string") {
    const area = context.areas.find((item) => item.slug === areaSlug);
    if (!area || (!area.isActive && !(context.operation === "update" && context.existing?.area_slug === areaSlug))) errors.areaSlug = "Choose an available area.";
  }
  const existing = context.existing;
  const approval = Object.hasOwn(result, "approvalStatus") ? result.approvalStatus : existing?.approval_status ?? null;
  const verification = Object.hasOwn(result, "verificationStatus") ? result.verificationStatus : existing?.verification_status ?? "sample";
  const verifiedAt = Object.hasOwn(result, "lastVerifiedAt") ? result.lastVerifiedAt : existing?.last_verified_at ?? null;
  const brokerageType = Object.hasOwn(result, "brokerageType") ? result.brokerageType : existing?.brokerage_type ?? null;
  const brokerageValue = Object.hasOwn(result, "brokerageValue") ? result.brokerageValue : existing?.brokerage_value ?? null;
  if (approval === "approved" && verification === "sample") errors.approvalStatus = "A sample property cannot be approved.";
  if (verification === "broker-confirmed" && !verifiedAt) errors.lastVerifiedAt = "Enter a verification date.";
  if (brokerageType !== null && brokerageType !== "none" && brokerageValue === null) errors.brokerageValue = "Enter a brokerage value.";
  if (brokerageType === "none" && brokerageValue !== null) errors.brokerageValue = "Clear the brokerage value when the type is none.";
  if (Object.hasOwn(result, "status") && (intent === "preserve" || result.status !== (intent === "draft" ? "draft" : "available"))) errors.status = "Status conflicts with the selected action.";
  if (Object.keys(errors).length || (intent !== "draft" && intent !== "publish" && intent !== "preserve")) return { ok: false, errors };
  return { ok: true, operation: context.operation, intent, fields: result };
}
