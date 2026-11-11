import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { LeadStatusBadge } from "@/components/admin/badges";
import { Notice } from "@/components/common/notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireBroker } from "@/lib/auth/broker";
import { formatDate } from "@/lib/format";
import { getBrokerCustomerById } from "@/lib/supabase/queries/broker-customers";
import { leadSourceLabels } from "@/modules/leads/constants";

import { CustomerEditForm } from "./customer-edit-form";

export const metadata: Metadata = {
  title: "Customer details",
};

// Session-guarded admin pages are allowed to block during navigation.
export const instant = false;

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

const customerIdPattern = /^CUST-[0-9]+$/;

export default async function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  await requireBroker();

  const { id } = await params;
  if (!customerIdPattern.test(id)) notFound();

  const customer = await getBrokerCustomerById(id);
  if (!customer) notFound();

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Customers", href: "/admin/customers" },
          { label: customer.id },
        ]}
        eyebrow="Customer"
        title={customer.name}
        description={`${customer.id} · ${customer.enquiryCount} ${customer.enquiryCount === 1 ? "enquiry" : "enquiries"} · matched by ${customer.normalizedPhone}`}
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/customers">Back to customers</Link>
          </Button>
        }
      />

      <Notice className="mt-6">
        Enquiries below are managed independently. Opening one uses the existing
        enquiry workspace, where status and internal notes are saved per
        enquiry.
      </Notice>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card className="h-fit gap-5 p-5 sm:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">Customer details</h2>
              {customer.isDemo ? <Badge variant="outline">Demo</Badge> : null}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Created {formatDate(customer.createdAt)} · Last updated{" "}
              {formatDate(customer.updatedAt)}
            </p>
          </div>

          <CustomerEditForm
            customer={{
              id: customer.id,
              name: customer.name,
              phone: customer.phone,
              email: customer.email,
              isDemo: customer.isDemo,
            }}
          />

          <dl className="space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Enquiries</dt>
              <dd className="font-medium text-foreground">{customer.enquiryCount}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Active enquiries</dt>
              <dd className="font-medium text-foreground">{customer.activeEnquiryCount}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Latest enquiry</dt>
              <dd className="text-right text-foreground">
                {customer.latestEnquiryAt ? formatDate(customer.latestEnquiryAt) : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Latest activity</dt>
              <dd className="text-right text-foreground">
                {customer.latestActivityAt
                  ? `${customer.latestActivityLabel ?? "Activity"} · ${formatDate(customer.latestActivityAt)}`
                  : "None yet"}
              </dd>
            </div>
          </dl>
        </Card>

        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Enquiry history</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Every linked enquiry keeps its own property, message, status and
                internal timeline.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/leads">
                <ArrowUpRight aria-hidden="true" />
                Open all enquiries
              </Link>
            </Button>
          </div>

          {customer.enquiries.length === 0 ? (
            <Card className="mt-4 p-5 text-sm text-muted-foreground">
              No enquiries are linked to this customer.
            </Card>
          ) : (
            <ol className="mt-4 space-y-4">
              {customer.enquiries.map((enquiry) => (
                <li key={enquiry.id}>
                  <Card className="gap-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-mono text-xs font-semibold text-muted-foreground">
                            {enquiry.id}
                          </p>
                          <LeadStatusBadge status={enquiry.status} />
                          {enquiry.isDemo ? <Badge variant="outline">Demo</Badge> : null}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatDate(enquiry.createdAt)}
                          {enquiry.source ? ` · ${leadSourceLabels[enquiry.source]}` : ""}
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/leads?lead=${encodeURIComponent(enquiry.id)}`}>
                          Open enquiry
                        </Link>
                      </Button>
                    </div>

                    <div className="text-sm">
                      <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                        Interested property
                      </p>
                      {enquiry.propertyId ? (
                        <p className="mt-1">
                          <Link
                            href={`/admin/properties/${encodeURIComponent(enquiry.propertyId)}/edit`}
                            className="font-medium text-foreground hover:text-primary"
                          >
                            {enquiry.propertyId}
                          </Link>
                        </p>
                      ) : (
                        <p className="mt-1 text-muted-foreground">General enquiry</p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                        Original message
                      </p>
                      <blockquote className="mt-1 rounded-lg border border-border bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
                        {enquiry.message}
                      </blockquote>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                          Internal notes
                        </p>
                        {enquiry.notes.length > 0 ? (
                          <ul className="mt-2 space-y-2">
                            {enquiry.notes.map((note) => (
                              <li
                                key={note.id}
                                className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
                              >
                                <p>{note.body}</p>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {formatDate(note.createdAt)}
                                </p>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">No notes yet.</p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                          Activity history
                        </p>
                        {enquiry.activities.length > 0 ? (
                          <ol className="mt-2 space-y-2">
                            {enquiry.activities.map((activity) => (
                              <li
                                key={activity.id}
                                className="relative border-l border-border pl-3"
                              >
                                <p className="text-sm font-medium text-foreground">
                                  {activity.label}
                                </p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  {formatDate(activity.at)}
                                </p>
                                {activity.detail ? (
                                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                    {activity.detail}
                                  </p>
                                ) : null}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">No activity yet.</p>
                        )}
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
