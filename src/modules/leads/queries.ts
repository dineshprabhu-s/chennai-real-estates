import type { Lead, LeadStatus } from "@/types/lead";

/**
 * Empty sample lead store for the foundation build.
 * No customer information is included. This module will be replaced by the
 * Supabase-backed repository when the leads workflow is implemented.
 */
const demoLeads: Lead[] = [];

export function getLeads(): Lead[] {
  return [...demoLeads];
}

export function getLeadStatusCounts(): Record<LeadStatus, number> {
  const counts: Record<LeadStatus, number> = {
    new: 0,
    contacted: 0,
    closed: 0,
  };

  for (const lead of demoLeads) {
    counts[lead.status] += 1;
  }

  return counts;
}
