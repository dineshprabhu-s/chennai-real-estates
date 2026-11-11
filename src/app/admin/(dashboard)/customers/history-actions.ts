"use server";

import { requireBroker } from "@/lib/auth/broker";
import type { BrokerCustomerPageFilters } from "@/lib/supabase/broker.types";
import { getBrokerCustomerPage } from "@/lib/supabase/queries/broker-customers";

export async function loadBrokerCustomerHistory(
  filters: BrokerCustomerPageFilters,
) {
  await requireBroker();

  try {
    return { ok: true as const, data: await getBrokerCustomerPage(filters) };
  } catch {
    return {
      ok: false as const,
      message: "Unable to load customers. Please try again.",
    };
  }
}
