"use server";

import { revalidatePath } from "next/cache";

import { requireBroker } from "@/lib/auth/broker";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateCustomerInput } from "@/lib/validation/customer";

export type CustomerActionResult =
  | { ok: true; id: string; changed: boolean; warning?: string }
  | {
      ok: false;
      kind: "validation" | "not-found" | "demo" | "conflict" | "database";
      message: string;
      fields?: Record<string, string>;
    };

interface CustomerWriteRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  is_demo: boolean;
}

const customerIdPattern = /^CUST-[0-9]+$/;
const readColumns = "id,name,phone,email,is_demo";

function databaseError(error: { code?: string } | null): CustomerActionResult {
  switch (error?.code) {
    case "23505":
      return {
        ok: false,
        kind: "conflict",
        message: "Another customer already uses this phone number.",
        fields: { phone: "This phone number belongs to another customer." },
      };
    case "23503":
      return {
        ok: false,
        kind: "validation",
        message: "The customer or a related record is no longer available.",
      };
    case "23514":
    case "23502":
    case "22P02":
    case "22003":
      return {
        ok: false,
        kind: "validation",
        message: "The customer details are invalid. Review the fields and try again.",
      };
    default:
      return {
        ok: false,
        kind: "database",
        message: "Unable to save the customer. Please try again.",
      };
  }
}

function validCustomerId(value: unknown): value is string {
  return typeof value === "string" && customerIdPattern.test(value);
}

function revalidateCustomerPages(id: string): boolean {
  let success = true;

  for (const path of [
    "/admin/customers",
    `/admin/customers/${encodeURIComponent(id)}`,
    "/admin/leads",
    "/admin/dashboard",
  ]) {
    try {
      revalidatePath(path);
    } catch {
      success = false;
    }
  }

  return success;
}

/**
 * Updates the current customer name, phone and email.
 *
 * The write deliberately does not cascade into enquiry snapshots; each lead
 * keeps its own message, status and timeline. Changing a phone never merges
 * two customers, and the database unique constraint rejects a number already
 * owned by another customer. Demo customers are rejected from the
 * authoritative database row, never from caller input.
 */
export async function updateBrokerCustomer(
  id: unknown,
  input: unknown,
): Promise<CustomerActionResult> {
  await requireBroker();

  if (!validCustomerId(id)) {
    return {
      ok: false,
      kind: "validation",
      message: "Enter a valid customer ID.",
      fields: { id: "Enter a valid customer ID." },
    };
  }

  const validated = validateCustomerInput(input);
  if (!validated.ok) {
    return {
      ok: false,
      kind: "validation",
      message: validated.message,
      fields: validated.fields,
    };
  }

  const values = validated.values;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error: readError } = await supabase
      .from("broker_customer_summary")
      .select(readColumns)
      .eq("id", id)
      .maybeSingle();

    if (readError) return databaseError(readError);
    if (data === null) {
      return { ok: false, kind: "not-found", message: "Customer not found." };
    }

    const existing = data as unknown as CustomerWriteRow;
    if (existing.is_demo) {
      return {
        ok: false,
        kind: "demo",
        message: "Customers created from seeded demo enquiries are read-only.",
      };
    }

    if (
      existing.name === values.name &&
      existing.phone === values.phone &&
      existing.email === values.email
    ) {
      return { ok: true, id, changed: false };
    }

    const { data: updated, error: updateError } = await supabase
      .from("customers")
      .update({ name: values.name, phone: values.phone, email: values.email })
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (updateError) return databaseError(updateError);
    if (updated === null) {
      return {
        ok: false,
        kind: "conflict",
        message: "This customer was changed by another session. Refresh and try again.",
      };
    }

    const warning = revalidateCustomerPages(id)
      ? undefined
      : "Saved, but some pages could not be refreshed.";

    return { ok: true, id, changed: true, ...(warning ? { warning } : {}) };
  } catch {
    return databaseError(null);
  }
}
