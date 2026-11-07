import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Notice } from "@/components/common/notice";
import { Button } from "@/components/ui/button";
import { leadStatusOptions } from "@/modules/leads/constants";
import { getLeads } from "@/modules/leads/queries";
import { getAllProperties } from "@/modules/properties/queries";
import type { LeadStatus } from "@/types/lead";

import { AdminLeadsClient } from "./admin-leads-client";

export const metadata: Metadata = {
  title: "Leads and enquiries",
};

interface AdminLeadsPageProps {
  searchParams: Promise<{ lead?: string | string[]; status?: string | string[] }>;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Server wrapper for the demo lead inbox. Every record returned here is
 * seeded sample data; no customer enquiry data is fetched from anywhere.
 */
export default async function AdminLeadsPage({
  searchParams,
}: AdminLeadsPageProps) {
  const params = await searchParams;
  const requestedLeadId = firstValue(params.lead);
  const requestedStatus = firstValue(params.status);
  const leads = getLeads();
  const initialLeadId = leads.some((lead) => lead.id === requestedLeadId)
    ? requestedLeadId
    : undefined;
  const initialStatus = leadStatusOptions.find(
    (option) => option.value === requestedStatus,
  )?.value as LeadStatus | undefined;
  const properties = getAllProperties().map((property) => ({
    id: property.id,
    title: property.title,
    locality: property.locality,
  }));

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[{ label: "Leads / Enquiries" }]}
        eyebrow="Leads"
        title="Customer enquiries"
        description="A single inbox for website, WhatsApp, and phone enquiries. Seeded demo records are labelled so they are never mistaken for real customers."
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
        Development preview — every enquiry below is clearly labelled sample
        data. Status changes and internal notes stay in this browser session and
        are never stored or shown on public pages.
      </Notice>

      <AdminLeadsClient
        initialLeads={leads}
        properties={properties}
        initialLeadId={initialLeadId}
        initialStatus={initialStatus}
      />
    </div>
  );
}
