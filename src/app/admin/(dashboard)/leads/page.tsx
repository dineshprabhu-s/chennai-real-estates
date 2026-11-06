import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { leadPipeline, leadStatusLabels } from "@/modules/leads/constants";
import { getLeadStatusCounts } from "@/modules/leads/queries";

export const metadata: Metadata = {
  title: "Leads",
};

export default function AdminLeadsPage() {
  const counts = getLeadStatusCounts();

  return (
    <div>
      <PageHeader
        variant="admin"
        eyebrow="Leads"
        title="Customer enquiries"
        description="A single inbox for enquiries raised through the public website and property pages."
        actions={
          <Button asChild variant="outline">
            <Link href={siteConfig.links.contact}>View contact page</Link>
          </Button>
        }
      />

      <Notice className="mt-6">
        The leads module is not connected yet. Once the contact form is wired to
        the leads store, enquiries will appear here with their source and status.
      </Notice>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {leadPipeline.map((stage) => (
          <Card key={stage.status} className="gap-2 p-5">
            <p className="text-sm font-medium text-muted-foreground">
              {leadStatusLabels[stage.status]}
            </p>
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              {counts[stage.status]}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {stage.description}
            </p>
          </Card>
        ))}
      </div>

      <EmptyState
        className="mt-6"
        icon={Users}
        title="No enquiries yet"
        description="When a visitor sends an enquiry, it will be collected here with the property reference, contact details, and a status you can track."
        action={
          <Button asChild variant="outline">
            <Link href="/admin/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
