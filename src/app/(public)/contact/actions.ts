"use server";

import { createPublicSupabaseClient } from "@/lib/supabase/public-server";
import {
  publicLeadMessages,
  validatePublicLeadInput,
  type PublicLeadSubmissionResult,
} from "@/lib/validation/public-lead";

interface PublicLeadSubmissionInput {
  name: string;
  phone: string;
  email: string | null;
  message: string;
  propertyId: string | null;
  /** Honeypot field. Legitimate submissions leave this empty. */
  website?: string;
}

function mapRpcError(code: string | undefined): PublicLeadSubmissionResult {
  switch (code) {
    case "22023":
      return {
        ok: false,
        kind: "validation",
        message: publicLeadMessages.validation,
      };
    case "P0001":
      return {
        ok: false,
        kind: "property-unavailable",
        message: publicLeadMessages.propertyUnavailable,
      };
    case "P0002":
      return {
        ok: false,
        kind: "duplicate",
        message: publicLeadMessages.duplicate,
      };
    default:
      return {
        ok: false,
        kind: "error",
        message: publicLeadMessages.generic,
      };
  }
}

/**
 * Submits a public enquiry through the narrow, anonymous RPC.
 *
 * Only approved enquiry fields cross this boundary. The database derives the
 * source, status, demo flag, ID, and timestamps, and returns no row. Raw
 * database errors and submitted PII are never returned to the browser or
 * written to logs.
 *
 * Abuse protection here is intentionally minimal: a honeypot and the RPC's
 * 60-second duplicate guard. Edge/WAF rate limiting must be configured before
 * production launch; this is not comprehensive bot protection.
 */
export async function submitPublicLead(
  input: PublicLeadSubmissionInput,
): Promise<PublicLeadSubmissionResult> {
  if (typeof input !== "object" || input === null) {
    return {
      ok: false,
      kind: "validation",
      message: publicLeadMessages.validation,
    };
  }

  // A filled honeypot is treated as a failed submission, not a success. The
  // response stays generic so automated clients learn nothing from it.
  if (typeof input.website === "string" && input.website.trim().length > 0) {
    return {
      ok: false,
      kind: "error",
      message: publicLeadMessages.generic,
    };
  }

  const validation = validatePublicLeadInput(input);
  if (!validation.ok) {
    return {
      ok: false,
      kind: "validation",
      message: validation.message,
      fields: validation.fields,
    };
  }

  const { name, phone, email, message, propertyId } = validation.values;

  try {
    const supabase = createPublicSupabaseClient();
    const { error } = await supabase.rpc("submit_public_lead", {
      p_name: name,
      p_phone: phone,
      p_email: email,
      p_message: message,
      p_property_id: propertyId,
    });

    if (!error) {
      return { ok: true };
    }

    return mapRpcError(error.code);
  } catch {
    return {
      ok: false,
      kind: "error",
      message: publicLeadMessages.generic,
    };
  }
}
