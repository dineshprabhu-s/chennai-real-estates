import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Notice } from "@/components/common/notice";
import { Button } from "@/components/ui/button";
import { requireBroker } from "@/lib/auth/broker";
import {
  getBrokerLeadById,
  getBrokerLeads,
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
  const [inbox, propertyOptions] = await Promise.all([
    getBrokerLeads(),
    getBrokerPropertyOptions(),
  ]);

  let leads = inbox.leads;

  // `?lead=` may point at a record outside the explicit inbox window. Fetch it
  // directly so the existing deep link still opens the detail drawer.
  if (requestedLeadId && !leads.some((lead) => lead.id === requestedLeadId)) {
    const requestedLead = await getBrokerLeadById(requestedLeadId);
    if (requestedLead) leads = [requestedLead, ...leads];
  }

  const initialLeadId = leads.some((lead) => lead.id === requestedLeadId)
    ? requestedLeadId
    : undefined;
  const initialStatus = leadStatusOptions.find(
    (option) => option.value === requestedStatus,
  )?.value as LeadStatus | undefined;
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

      {inbox.hasMore ? (
        <Notice className="mt-4">
          Showing the most recent {inbox.limit} of {inbox.total} enquiries. Older
          records are not loaded in this view.
        </Notice>
      ) : null}

      <AdminLeadsClient
        key={initialLeadId ?? "inbox"}
        initialLeads={leads}
        properties={properties}
        totalLeads={Math.max(inbox.total, leads.length)}
        initialLeadId={initialLeadId}
        initialStatus={initialStatus}
      />
    </div>
  );
}
