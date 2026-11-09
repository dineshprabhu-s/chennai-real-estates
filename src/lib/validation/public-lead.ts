/**
 * Shared validation for public lead enquiries.
 *
 * This module is intentionally free of server-only imports so the contact form
 * can validate in the browser and the Server Action can repeat the same checks
 * on the server. The PostgreSQL RPC remains the authoritative validator.
 */

export type PublicLeadField = "name" | "phone" | "email" | "message";

export type PublicLeadFieldErrors = Partial<Record<PublicLeadField, string>>;

export interface PublicLeadValues {
  name: string;
  /** Normalized digits only. */
  phone: string;
  email: string | null;
  message: string;
  propertyId: string | null;
}

export interface PublicLeadRawInput {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  message?: unknown;
  propertyId?: unknown;
}

export type PublicLeadValidationResult =
  | { ok: true; values: PublicLeadValues }
  | { ok: false; fields: PublicLeadFieldErrors; message: string };

export type PublicLeadSubmissionResult =
  | { ok: true }
  | {
      ok: false;
      kind: "validation" | "duplicate" | "property-unavailable" | "error";
      message: string;
      fields?: PublicLeadFieldErrors;
    };

export const publicLeadMessages = {
  success:
    "Thanks, your enquiry has been sent. The broker will be in touch using the details you provided.",
  validation: "Please check the highlighted fields and try again.",
  duplicate:
    "You have just sent this enquiry. Please wait a minute before sending it again.",
  propertyUnavailable:
    "This property is no longer available for enquiries. Please call the broker to check availability.",
  generic:
    "We could not send your enquiry right now. Please try again, or call the broker directly.",
  invalidPropertyReference:
    "The property reference is invalid. Please refresh the page and try again.",
} as const;

const NAME_MIN = 2;
const NAME_MAX = 120;
const PHONE_MIN_DIGITS = 10;
const PHONE_MAX_DIGITS = 15;
const PHONE_MAX_INPUT = 256;
const EMAIL_MAX = 254;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 4000;
const PROPERTY_ID_MAX = 64;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Validates and normalizes a public enquiry. Unknown or non-string values are
 * treated as empty input unless a property reference was explicitly supplied
 * in an unusable shape, which is rejected rather than downgraded.
 */
export function validatePublicLeadInput(
  input: PublicLeadRawInput,
): PublicLeadValidationResult {
  const fields: PublicLeadFieldErrors = {};

  const name = readText(input.name);
  if (name.length < NAME_MIN) {
    fields.name = "Please enter your name.";
  } else if (name.length > NAME_MAX) {
    fields.name = "Please keep your name under 120 characters.";
  }

  const phoneInput = readText(input.phone);
  const phone = phoneInput.replace(/\D/g, "");
  if (
    phoneInput.length > PHONE_MAX_INPUT ||
    phone.length < PHONE_MIN_DIGITS ||
    phone.length > PHONE_MAX_DIGITS
  ) {
    fields.phone = "Enter a valid phone number with 10 to 15 digits.";
  }

  const emailInput = readText(input.email);
  let email: string | null = null;
  if (emailInput.length > 0) {
    if (emailInput.length > EMAIL_MAX) {
      fields.email = "Please keep your email under 254 characters.";
    } else if (!EMAIL_PATTERN.test(emailInput)) {
      fields.email = "Enter a valid email address, or leave this blank.";
    } else {
      email = emailInput;
    }
  }

  const message = readText(input.message);
  if (message.length < MESSAGE_MIN) {
    fields.message = "Add a little more detail (at least 10 characters).";
  } else if (message.length > MESSAGE_MAX) {
    fields.message = "Please keep your message under 4,000 characters.";
  }

  let propertyId: string | null = null;
  if (input.propertyId !== null && input.propertyId !== undefined) {
    if (typeof input.propertyId !== "string") {
      return {
        ok: false,
        fields,
        message: publicLeadMessages.invalidPropertyReference,
      };
    }

    const candidate = input.propertyId.trim();
    if (candidate.length === 0 || candidate.length > PROPERTY_ID_MAX) {
      return {
        ok: false,
        fields,
        message: publicLeadMessages.invalidPropertyReference,
      };
    }

    propertyId = candidate;
  }

  if (Object.keys(fields).length > 0) {
    return { ok: false, fields, message: publicLeadMessages.validation };
  }

  return { ok: true, values: { name, phone, email, message, propertyId } };
}
