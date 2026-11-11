/**
 * Shared customer validation for the broker Customers workspace.
 *
 * The database remains authoritative: `customers.normalized_phone` is a
 * generated column and its unique constraint rejects duplicate customers.
 * This module keeps the same normalization rules so the form and Server Action
 * can reject obviously invalid input before a write.
 */

export type CustomerField = "name" | "phone" | "email";
export type CustomerFieldErrors = Partial<Record<CustomerField, string>>;

export interface CustomerValues {
  name: string;
  /** Display value as entered. The database derives the matching value. */
  phone: string;
  email: string | null;
}

export type CustomerValidationResult =
  | { ok: true; values: CustomerValues }
  | { ok: false; fields: CustomerFieldErrors; message: string };

/**
 * Mirrors `public.normalize_customer_phone(text)` for Indian mobile numbers.
 * Returns null when the value cannot be stored as a usable customer phone.
 */
export function normalizeCustomerPhone(value: string): string | null {
  const digits = value.replace(/[^0-9]/g, "");

  if (digits.length < 10 || digits.length > 15) return null;

  if (
    digits.length === 12 &&
    digits.startsWith("91") &&
    /^[6-9][0-9]{9}$/.test(digits.slice(2))
  ) {
    return digits.slice(2);
  }

  if (
    digits.length === 11 &&
    digits.startsWith("0") &&
    /^[6-9][0-9]{9}$/.test(digits.slice(1))
  ) {
    return digits.slice(1);
  }

  return digits;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCustomerInput(input: unknown): CustomerValidationResult {
  const fields: CustomerFieldErrors = {};
  const record =
    input !== null && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};

  const rawName = record.name;
  const name = typeof rawName === "string" ? rawName.trim() : "";
  if (name.length < 2 || name.length > 120) {
    fields.name = "Enter a customer name between 2 and 120 characters.";
  }

  const rawPhone = record.phone;
  const phone = typeof rawPhone === "string" ? rawPhone.trim() : "";
  if (phone.length === 0 || phone.length > 64) {
    fields.phone = "Enter a valid phone number.";
  } else if (normalizeCustomerPhone(phone) === null) {
    fields.phone = "Enter a phone number with 10 to 15 digits.";
  }

  const rawEmail = record.email;
  const email =
    rawEmail === undefined || rawEmail === null || rawEmail === ""
      ? null
      : typeof rawEmail === "string"
        ? rawEmail.trim() || null
        : null;
  if (
    email !== null &&
    (email.length > 254 || !emailPattern.test(email))
  ) {
    fields.email = "Enter a valid email address, or leave it blank.";
  }

  if (Object.keys(fields).length > 0) {
    return {
      ok: false,
      fields,
      message: "Review the customer details and try again.",
    };
  }

  return { ok: true, values: { name, phone, email } };
}
