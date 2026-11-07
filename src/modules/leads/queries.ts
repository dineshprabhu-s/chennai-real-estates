import { demoLeads } from "@/modules/leads/data/demo-leads";
import type { Lead, LeadStatus } from "@/types/lead";

/**
 * Demo lead access layer. There is no storage or mutation here; admin screens
 * keep local preview changes in the browser only.
 */
export function getLeads(): Lead[] {
  return demoLeads.map((lead) => ({
    ...lead,
    notes: [...(lead.notes ?? [])],
    activities: [...(lead.activities ?? [])],
  }));
}

export function getRecentLeads(limit = 5): Lead[] {
  return getLeads()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, Math.max(0, limit));
}

export function getLeadById(id: string): Lead | undefined {
  return getLeads().find((lead) => lead.id === id);
}

export function getLeadStatusCounts(): Record<LeadStatus, number> {
  const counts: Record<LeadStatus, number> = {
    new: 0,
    contacted: 0,
    "visit-scheduled": 0,
    negotiation: 0,
    converted: 0,
    "closed-lost": 0,
  };

  for (const lead of demoLeads) {
    counts[lead.status] += 1;
  }

  return counts;
}

export interface LeadStats extends Record<LeadStatus, number> {
  total: number;
  pending: number;
  scheduledVisits: number;
}

export function getLeadStats(): LeadStats {
  const counts = getLeadStatusCounts();

  return {
    ...counts,
    total: demoLeads.length,
    pending: counts.new + counts.contacted + counts["visit-scheduled"],
    scheduledVisits: counts["visit-scheduled"],
  };
}
