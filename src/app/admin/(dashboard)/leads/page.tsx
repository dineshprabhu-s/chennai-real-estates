import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Notice } from "@/components/common/notice";
import { Button } from "@/components/ui/button";
import { requireBroker } from "@/lib/auth/broker";
import {
  getBrokerLeadById,
  getBrokerLeadPage,
  getBrokerLeadStats,
  getBrokerPropertyOptions,
} from "@/lib/supabase/queries/broker-leads";
import { leadStatusOptions } from "@/modules/leads/constants";
import type { LeadStatus } from "@/types/lead";

import { AdminLeadsClient } from "./admin-leads-client";

export const metadata: Metadata = {
  title: "Leads and enquiries",
};

// Session-guarded admin pages are allowed to block during navigation.
export const instant = false;

interface AdminLeadsPageProps {
  searchParams: Promise<{ lead?: string | string[]; status?: string | string[] }>;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Server wrapper for the broker lead inbox. Records come from Supabase through
 * a broker-guarded, request-scoped read layer; seeded rows stay labelled via
 * `isDemo`.
 */
export default async function AdminLeadsPage({
  searchParams,
}: AdminLeadsPageProps) {
  await requireBroker();

  const params = await searchParams;
  const requestedLeadId = firstValue(params.lead);
  const requestedStatus = firstValue(params.status);
  const initialStatus = leadStatusOptions.find(
    (option) => option.value === requestedStatus,
  )?.value as LeadStatus | undefined;
  const [inbox, propertyOptions, stats] = await Promise.all([
    getBrokerLeadPage({ page: 1, query: "", status: initialStatus ?? "all", source: "all", propertyId: "all" }),
    getBrokerPropertyOptions(),
    getBrokerLeadStats(),
  ]);

  const deepLead = requestedLeadId
    ? inbox.leads.find((lead) => lead.id === requestedLeadId) ?? await getBrokerLeadById(requestedLeadId)
    : null;
  const initialLeadId = deepLead?.id;
  const properties = propertyOptions.map((property) => ({
    id: property.id,
    title: property.title,
    locality: property.locality,
    status: property.status,
  }));

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[{ label: "Leads / Enquiries" }]}
        eyebrow="Leads"
        title="Customer enquiries"
        description="A single inbox for website, WhatsApp, and phone enquiries. Seeded demo records are labelled individually so they are never mistaken for real customers."
        actions={
          <Button asChild variant="outline">
            <Link href="/">
              <ExternalLink aria-hidden="true" />
              Open public website
            </Link>
          </Button>
        }
      />

      <Notice className="mt-6">
        Broker inbox — enquiry records are read from Supabase. Seeded demo rows
        remain visible, labelled, and read-only. Status changes and internal
        notes on other records are saved to the broker workspace.
      </Notice>

      <AdminLeadsClient
        key={`${initialLeadId ?? "inbox"}:${initialStatus ?? "all"}`}
        initialLeads={inbox.leads}
        initialPage={inbox}
        initialDeepLead={deepLead}
        stats={stats}
        properties={properties}
        totalLeads={inbox.total}
        initialLeadId={initialLeadId}
        initialStatus={initialStatus}
      />
    </div>
  );
}
