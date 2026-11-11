"use client";

import {
  CalendarCheck,
  CheckCircle2,
  Eye,
  Handshake,
  Inbox,
  PhoneCall,
  RotateCcw,
  Search,
  StickyNote,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { addBrokerLeadNote, updateBrokerLeadStatus } from "./actions";
import { loadBrokerLeadHistory, loadBrokerLeadDetail } from "./history-actions";
import { LeadStatusBadge } from "@/components/admin/badges";
import { AdminDataTable, type AdminTableColumn } from "@/components/admin/data-table";
import { ActionFeedback } from "@/components/admin/action-feedback";
import { AdminModal } from "@/components/admin/modal";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import type { BrokerLead, BrokerLeadStats } from "@/lib/supabase/broker.types";
import type { BrokerLeadPage } from "@/lib/supabase/queries/broker-leads";
import {
  leadSourceLabels,
  leadStatusLabels,
  leadStatusOptions,
} from "@/modules/leads/constants";
import type { LeadStatus, LeadSource } from "@/types/lead";
import type { PropertyStatus } from "@/types/property";

interface LeadPropertyOption {
  id: string;
  title: string;
  locality: string;
  status: PropertyStatus;
}

interface AdminLeadsClientProps {
  initialLeads: BrokerLead[];
  properties: LeadPropertyOption[];
  totalLeads: number;
  initialPage: BrokerLeadPage;
  initialDeepLead: BrokerLead | null;
  stats: BrokerLeadStats;
  initialLeadId?: string;
  initialStatus?: LeadStatus;
}

const filterLabelClass =
  "text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase";

const statusIcons = {
  new: Inbox,
  contacted: PhoneCall,
  "visit-scheduled": CalendarCheck,
  negotiation: Handshake,
  converted: CheckCircle2,
  "closed-lost": XCircle,
} as const;

export function AdminLeadsClient({
  initialLeads,
  properties,
  totalLeads,
  initialPage,
  initialDeepLead,
  stats,
  initialLeadId,
  initialStatus,
}: AdminLeadsClientProps) {
  void initialLeads;
  void totalLeads;
  const router = useRouter();
  const [data, setData] = useState(initialPage);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<LeadStatus | "all">(initialStatus ?? "all");
  const [source, setSource] = useState<LeadSource | "all">("all");
  const [propertyId, setPropertyId] = useState("all");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialLeadId ?? null);
  const [deepLead, setDeepLead] = useState<BrokerLead | null>(initialDeepLead);
  const [noteDraft, setNoteDraft] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState<"status" | "note" | null>(null);
  const skipInitial = useRef(true);
  const leads = data.leads;
  const selectedLead = (deepLead?.id === selectedId ? deepLead : null) ?? leads.find((lead) => lead.id === selectedId) ?? null;
  const counts = stats;
  const filtered = leads;
  const hasFilters = query.trim().length > 0 || status !== "all" || source !== "all" || propertyId !== "all";
  const totalPages = Math.max(1, Math.ceil(data.matchingTotal / data.pageSize));

  useEffect(() => {
    if (skipInitial.current) { skipInitial.current = false; return; }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true); setLoadError(null);
      try {
        const result = await loadBrokerLeadHistory({ page, query, status, source, propertyId });
        if (cancelled) return;
        if (result.ok) setData(result.data); else setLoadError(result.message);
      } catch { if (!cancelled) setLoadError("Unable to load enquiries. Please try again."); }
      finally { if (!cancelled) setLoading(false); }
    }, 350);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [page, query, status, source, propertyId, revision]);

  async function refreshSelected(id: string) {
    const result = await loadBrokerLeadDetail(id);
    if (result.ok) setDeepLead(result.data);
    else setFeedback(result.message);
  }

  function clearFilters() {
    setLoading(true);
    setQuery("");
    setStatus("all");
    setSource("all");
    setPropertyId("all");
    setPage(1);
  }

  function propertyFor(lead: BrokerLead) {
    return properties.find((property) => property.id === lead.propertyId);
  }

  async function handleStatusChange(nextStatus: LeadStatus) {
    if (!selectedLead || pending !== null || selectedLead.isDemo) {
      return;
    }

    if (nextStatus === selectedLead.status) {
      setFeedback(`${selectedLead.id} is already "${leadStatusLabels[nextStatus]}".`);
      return;
    }

    setPending("status");
    setFeedback(null);

    try {
      const result = await updateBrokerLeadStatus(selectedLead.id, nextStatus);

      if (!result.ok) {
        setFeedback(result.message);
        return;
      }

      router.refresh();
      setRevision((value) => value + 1);
      void refreshSelected(selectedLead.id);
      setFeedback(
        result.changed
          ? `${selectedLead.id} moved to "${leadStatusLabels[nextStatus]}".${result.warning ? ` ${result.warning}` : ""}`
          : `${selectedLead.id} is already "${leadStatusLabels[nextStatus]}".`,
      );
    } catch {
      setFeedback("Unable to update the lead status. Please try again.");
    } finally {
      setPending(null);
    }
  }

  async function addNote() {
    if (!selectedLead || pending !== null || selectedLead.isDemo) {
      return;
    }

    const note = noteDraft.trim();
    if (note.length === 0) {
      setFeedback("Enter a note before saving.");
      return;
    }

    setPending("note");
    setFeedback(null);

    try {
      const result = await addBrokerLeadNote(selectedLead.id, note);

      if (!result.ok) {
        setFeedback(result.message);
        return;
      }

      setNoteDraft("");
      router.refresh();
      setRevision((value) => value + 1);
      void refreshSelected(selectedLead.id);
      setFeedback(
        `Internal note saved.${result.warning ? ` ${result.warning}` : ""}`,
      );
    } catch {
      setFeedback("Unable to save the note. Please try again.");
    } finally {
      setPending(null);
    }
  }

  const columns: Array<AdminTableColumn<BrokerLead>> = [
    {
      id: "id",
      header: "Lead ID",
      headerClassName: "pl-5",
      className: "pl-5 align-top",
      cell: (lead) => (
        <div>
          <span className="font-mono text-xs font-semibold text-foreground">
            {lead.id}
          </span>
          {lead.isDemo ? (
            <p className="mt-1">
              <Badge variant="outline">Demo</Badge>
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      className: "min-w-40 align-top",
      cell: (lead) => (
        <div>
          <p className="font-medium text-foreground">{lead.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{lead.phone}</p>
        </div>
      ),
    },
    {
      id: "phone",
      header: "Phone",
      className: "align-top whitespace-nowrap text-muted-foreground",
      cell: (lead) => lead.phone,
    },
    {
      id: "property",
      header: "Interested property",
      className: "min-w-44 align-top",
      cell: (lead) => {
        const property = propertyFor(lead);
        return property ? (
          <div>
            <p className="text-foreground">{property.title}</p>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {property.id}
            </p>
          </div>
        ) : (
          <span className="text-muted-foreground">General enquiry</span>
        );
      },
    },
    {
      id: "source",
      header: "Source",
      className: "align-top text-muted-foreground",
      cell: (lead) =>
        lead.source ? leadSourceLabels[lead.source] : "Not specified",
    },
    {
      id: "date",
      header: "Enquiry date",
      className: "align-top whitespace-nowrap text-muted-foreground",
      cell: (lead) => formatDate(lead.createdAt),
    },
    {
      id: "status",
      header: "Lead status",
      className: "align-top",
      cell: (lead) => <LeadStatusBadge status={lead.status} />,
    },
    {
      id: "actions",
      header: "Actions",
      headerClassName: "pr-5 text-right sticky right-0 z-10 bg-card",
      className: "pr-5 text-right align-top sticky right-0 bg-card",
      cell: (lead) => (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            setSelectedId(lead.id);
            setFeedback(null);
            setNoteDraft("");
          }}
          aria-label={`View ${lead.id}`}
          title="View enquiry"
        >
          <Eye aria-hidden="true" />
        </Button>
      ),
    },
  ];

  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {leadStatusOptions.map((option) => (
          <StatCard
            key={option.value}
            label={leadStatusLabels[option.value]}
            value={counts[option.value]}
            description={
              option.value === "visit-scheduled"
                ? "Scheduled property visits, separate from property availability."
                : option.value === "new"
                  ? "Enquiries awaiting a first response."
                  : option.value === "converted"
                    ? "Enquiries marked converted."
                    : option.value === "closed-lost"
                      ? "Enquiries marked closed or lost."
                      : `Enquiries in the ${leadStatusLabels[option.value].toLowerCase()} stage.`
            }
            icon={statusIcons[option.value]}
          />
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {loadError ? "Last loaded: " : "Showing "}
            <span className="font-semibold text-foreground">
              {filtered.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">
              {data.matchingTotal}
            </span>{" "}
            matching {data.matchingTotal === 1 ? "enquiry" : "enquiries"} · {data.total} total enquiries
          </p>
          <p className="text-xs text-muted-foreground">
            {loading ? "Loading enquiries…" : "Demo records are labelled individually"}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="lead-search" className={filterLabelClass}>
              Search
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="lead-search"
                type="search"
                maxLength={100}
                value={query}
                onChange={(event) => { setLoading(true); setPage(1); setQuery(event.target.value); }}
                placeholder="Search name, phone, email, lead or property"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="lead-status-filter" className={filterLabelClass}>
              Status
            </label>
            <NativeSelect
              id="lead-status-filter"
              value={status}
              onChange={(event) =>
                (setLoading(true), setPage(1), setStatus(event.target.value as LeadStatus | "all"))
              }
            >
              <option value="all">All statuses</option>
              {leadStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <label htmlFor="lead-source-filter" className={filterLabelClass}>
              Source
            </label>
            <NativeSelect
              id="lead-source-filter"
              value={source}
              onChange={(event) => { setLoading(true); setPage(1); setSource(event.target.value as LeadSource | "all"); }}
            >
              <option value="all">All sources</option>
              {Object.entries(leadSourceLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <label htmlFor="lead-property-filter" className={filterLabelClass}>
              Property
            </label>
            <NativeSelect
              id="lead-property-filter"
              value={propertyId}
              onChange={(event) => { setLoading(true); setPage(1); setPropertyId(event.target.value); }}
            >
              <option value="all">All properties</option>
              <option value="general">General enquiries</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.id} · {property.title}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <Button
              type="button"
              variant="ghost"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="w-full sm:w-auto"
            >
              <RotateCcw aria-hidden="true" />
              Clear filters
            </Button>
          </div>
        </div>
      </div>

      <ActionFeedback message={feedback} className="mt-4" />
      {loadError ? <div role="alert" className="mt-4 text-sm text-destructive">{loadError} <button type="button" className="underline" onClick={() => setRevision((value) => value + 1)}>Retry</button></div> : null}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm" aria-label="Enquiry pages">
        <Button type="button" variant="outline" size="sm" disabled={loading || page <= 1} onClick={() => { setLoading(true); setPage((value) => Math.max(1, value - 1)); }}>Previous</Button>
        <span>Page {data.page} of {totalPages}</span>
        <Button type="button" variant="outline" size="sm" disabled={loading || data.page >= totalPages} onClick={() => { setLoading(true); setPage((value) => value + 1); }}>Next</Button>
      </div>

      {!loading && !loadError && filtered.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={Search}
          title="No enquiries match these filters"
          description="Try a different name, phone number, property, or clear the filters."
          action={
            <Button type="button" variant="outline" onClick={clearFilters}>
              <RotateCcw aria-hidden="true" />
              Clear filters
            </Button>
          }
        />
      ) : !loadError ? (
        <>
          <div className="mt-4 space-y-3 lg:hidden">
            {filtered.map((lead) => {
              const property = propertyFor(lead);

              return (
                <Card key={lead.id} className="gap-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-[11px] font-semibold text-muted-foreground">
                          {lead.id}
                        </p>
                        {lead.isDemo ? (
                          <Badge variant="outline">Demo</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {lead.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {lead.phone}
                      </p>
                    </div>
                    <LeadStatusBadge status={lead.status} />
                  </div>

                  <div className="space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">
                        {property ? property.title : "General enquiry"}
                      </span>
                      {property ? ` · ${property.id}` : ""}
                    </p>
                    <p>
                      {lead.source ? leadSourceLabels[lead.source] : "No source"}{" "}
                      · {formatDate(lead.createdAt)}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedId(lead.id);
                      setFeedback(null);
                      setNoteDraft("");
                    }}
                  >
                    <Eye aria-hidden="true" />
                    View enquiry
                  </Button>
                </Card>
              );
            })}
          </div>

          <Card className="mt-4 hidden gap-0 overflow-hidden lg:block">
            <AdminDataTable
              rows={filtered}
              columns={columns}
              getRowKey={(lead) => lead.id}
              caption="Customer enquiries"
            />
          </Card>
        </>
      ) : null}

      <AdminModal
        open={selectedLead !== null}
        onClose={() => setSelectedId(null)}
        variant="drawer"
        title={selectedLead ? selectedLead.name : "Enquiry"}
        description={
          selectedLead
            ? `${selectedLead.id} · ${formatDate(selectedLead.createdAt)}`
            : undefined
        }
      >
        {selectedLead ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <LeadStatusBadge status={selectedLead.status} />
              {selectedLead.isDemo ? (
                <Badge variant="outline">Seeded demo enquiry</Badge>
              ) : null}
            </div>

            <section>
              <h3 className="text-sm font-semibold text-foreground">
                Contact information
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd>
                    <a
                      href={`tel:${selectedLead.phone.replace(/\s+/g, "")}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {selectedLead.phone}
                    </a>
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="text-right">
                    {selectedLead.email ? (
                      <a
                        href={`mailto:${selectedLead.email}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {selectedLead.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Not provided</span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Source</dt>
                  <dd>
                    {selectedLead.source
                      ? leadSourceLabels[selectedLead.source]
                      : "Not specified"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{formatDate(selectedLead.createdAt)}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">
                Interested property
              </h3>
              {(() => {
                const property = propertyFor(selectedLead);

                return property ? (
                  <div className="mt-2 rounded-lg border border-border p-3">
                    <p className="text-sm font-medium text-foreground">
                      {property.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {property.id} · {property.locality}
                    </p>
                    <Button asChild variant="link" size="sm" className="mt-1 h-auto p-0">
                      <Link
                        href={`/admin/properties/${property.id}/edit`}
                        onClick={() => setSelectedId(null)}
                      >
                        Open property record
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    General enquiry with no property selected.
                  </p>
                );
              })()}
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">
                Original message
              </h3>
              <blockquote className="mt-2 rounded-lg border border-border bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
                {selectedLead.message}
              </blockquote>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">
                Lead status
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {selectedLead.isDemo
                  ? "Seeded demo enquiries are read-only. Status changes are disabled for this record."
                  : "Status changes are saved to the broker workspace. Scheduling a visit does not change any property's availability status."}
              </p>
              <label htmlFor="lead-detail-status" className="sr-only">
                Change lead status
              </label>
              <NativeSelect
                id="lead-detail-status"
                value={selectedLead.status}
                disabled={selectedLead.isDemo || pending !== null}
                onChange={(event) =>
                  handleStatusChange(event.target.value as LeadStatus)
                }
                className="mt-3"
                aria-busy={pending === "status"}
              >
                {leadStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
              {pending === "status" ? (
                <p className="mt-2 text-xs text-muted-foreground" role="status">
                  Saving…
                </p>
              ) : null}
            </section>

            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <StickyNote aria-hidden="true" className="size-4 text-primary" />
                Internal notes
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {selectedLead.isDemo
                  ? "Seeded demo enquiries are read-only. Notes cannot be added to this record."
                  : "Notes are saved to the broker workspace and are never shown on public pages."}
              </p>

              {(selectedLead.notes ?? []).length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {(selectedLead.notes ?? []).map((note) => (
                    <li
                      key={note.id}
                      className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm leading-relaxed text-foreground"
                    >
                      <p>{note.body}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatDate(note.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  No notes yet.
                </p>
              )}

              <label htmlFor="lead-note" className="sr-only">
                Add an internal note
              </label>
              <Textarea
                id="lead-note"
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Add context for your next follow-up…"
                className="mt-3 min-h-20"
                disabled={selectedLead.isDemo || pending !== null}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addNote}
                disabled={
                  selectedLead.isDemo ||
                  pending !== null ||
                  noteDraft.trim().length === 0
                }
                className="mt-2"
              >
                {pending === "note" ? "Saving…" : "Add note"}
              </Button>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">
                Activity history
              </h3>
              <ol className="mt-3 space-y-3">
                {(selectedLead.activities ?? []).map((activity) => (
                  <li
                    key={activity.id}
                    className="relative border-l border-border pl-4"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute top-1 -left-[3px] size-1.5 rounded-full bg-primary"
                    />
                    <p className="text-sm font-medium text-foreground">
                      {activity.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
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
            </section>

            <ActionFeedback message={feedback} />

            <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              {selectedLead.isDemo
                ? "This is a seeded demo enquiry. Demo records are read-only and cannot be changed."
                : "Status changes and internal notes are saved to the broker workspace and never shown on public pages."}
            </p>
          </div>
        ) : null}
      </AdminModal>
    </div>
  );
}
