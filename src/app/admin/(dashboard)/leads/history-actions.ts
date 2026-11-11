"use server";

import { requireBroker } from "@/lib/auth/broker";
import { getBrokerLeadPage, getBrokerLeadById, type BrokerLeadPageFilters } from "@/lib/supabase/queries/broker-leads";

export async function loadBrokerLeadHistory(filters: BrokerLeadPageFilters) {
  await requireBroker();
  try { return { ok: true as const, data: await getBrokerLeadPage(filters) }; }
  catch { return { ok: false as const, message: "Unable to load enquiries. Please try again." }; }
}
export async function loadBrokerLeadDetail(id: string) {
  await requireBroker();
  try { return { ok: true as const, data: await getBrokerLeadById(id) }; }
  catch { return { ok: false as const, message: "Unable to load enquiry details. Please try again." }; }
}
