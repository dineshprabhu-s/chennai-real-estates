"use client";

import {
  Eye,
  Pencil,
  RotateCcw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { updateBrokerPropertyStatus } from "./actions";
import { AdminDataTable, type AdminTableColumn } from "@/components/admin/data-table";
import {
  AdminPropertyStatusBadge,
  VerificationBadge,
} from "@/components/admin/badges";
import { AdminModal } from "@/components/admin/modal";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDate, formatPrice } from "@/lib/format";
import {
  listingTypeLabels,
  adminPropertyStatusLabels,
  propertyStatusOptions,
  propertyTypeLabels,
} from "@/modules/properties/constants";
import type { Property, PropertyStatus } from "@/types/property";

type ListProperty = Pick<Property, "id" | "title" | "summary" | "locality" | "areaSlug" | "type" | "configuration" | "listingType" | "price" | "status" | "verificationStatus" | "updatedAt" | "builtUpAreaSqft" | "facing" | "bedrooms" | "bathrooms" | "floor" | "approvalStatus" | "brokerage">;

interface AreaOption {
  slug: string;
  name: string;
}

interface AdminPropertiesClientProps {
  initialProperties: ListProperty[];
  areas: AreaOption[];
}

type PendingAction = {
  status: PropertyStatus;
  propertyId: string;
  propertyTitle: string;
};

const filterLabelClass =
  "text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase";

export function AdminPropertiesClient({
  initialProperties,
  areas,
}: AdminPropertiesClientProps) {
  // Server props are authoritative: React can preserve this component's state
  // when a revalidated route receives a fresh Server Component payload.
  const properties = initialProperties;
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [listingType, setListingType] = useState("all");
  const [areaSlug, setAreaSlug] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ListProperty | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      properties.filter((property) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          [property.id, property.title, property.locality, property.summary]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);

        return (
          matchesQuery &&
          (listingType === "all" || property.listingType === listingType) &&
          (areaSlug === "all" || property.areaSlug === areaSlug) &&
          (type === "all" || property.type === type) &&
          (status === "all" || property.status === status)
        );
      }),
    [properties, normalizedQuery, listingType, areaSlug, type, status],
  );

  const hasFilters =
    normalizedQuery.length > 0 ||
    listingType !== "all" ||
    areaSlug !== "all" ||
    type !== "all" ||
    status !== "all";

  function clearFilters() {
    setQuery("");
    setListingType("all");
    setAreaSlug("all");
    setType("all");
    setStatus("all");
    setFeedback(null);
  }

  async function confirmStatusAction() {
    if (!pendingAction || saving) return;
    const action = pendingAction;
    setSaving(true);
    try {
      const result = await updateBrokerPropertyStatus(action.propertyId, action.status);
      if (!result.ok) { setFeedback(result.message); return; }
      router.refresh();
      setFeedback(`${action.propertyId} saved as ${adminPropertyStatusLabels[action.status]}.${result.warning ? ` ${result.warning}` : ""}`);
    } catch {
      setFeedback("Unable to update the property. Please try again.");
    } finally {
      setSaving(false);
      setPendingAction(null);
    }
  }

  function statusControl(property: ListProperty) {
    return (
      <NativeSelect
        aria-label={`Change status for ${property.id}`}
        value={property.status}
        disabled={saving}
        onChange={(event) => setPendingAction({
          status: event.target.value as PropertyStatus,
          propertyId: property.id,
          propertyTitle: property.title,
        })}
      >
        {propertyStatusOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </NativeSelect>
    );
  }

  const columns: Array<AdminTableColumn<ListProperty>> = [
    {
      id: "id",
      header: "Property ID",
      headerClassName: "pl-5",
      className: "pl-5 align-top",
      cell: (property) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {property.id}
        </span>
      ),
    },
    {
      id: "details",
      header: "Property details",
      className: "min-w-64 align-top",
      cell: (property) => (
        <div className="max-w-72">
          <Link
            href={`/admin/properties/${property.id}/edit`}
            className="font-medium text-foreground transition-colors hover:text-primary"
          >
            {property.title}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            {propertyTypeLabels[property.type]}
            {property.configuration
              ? ` · ${property.configuration.replace("-", " ").toUpperCase()}`
              : ""}
          </p>
        </div>
      ),
    },
    {
      id: "locality",
      header: "Locality",
      className: "align-top text-muted-foreground",
      cell: (property) => property.locality,
    },
    {
      id: "transaction",
      header: "Transaction",
      className: "align-top whitespace-nowrap text-muted-foreground",
      cell: (property) => listingTypeLabels[property.listingType],
    },
    {
      id: "price",
      header: "Price",
      className: "align-top font-medium whitespace-nowrap",
      cell: (property) => formatPrice(property.price, property.listingType),
    },
    {
      id: "status",
      header: "Status",
      className: "align-top",
      cell: (property) => <AdminPropertyStatusBadge status={property.status} />,
    },
    {
      id: "verification",
      header: "Verification",
      className: "align-top",
      cell: (property) => (
        <VerificationBadge status={property.verificationStatus} />
      ),
    },
    {
      id: "updated",
      header: "Last updated",
      className: "align-top whitespace-nowrap text-muted-foreground",
      cell: (property) => formatDate(property.updatedAt),
    },
    {
      id: "actions",
      header: "Actions",
      headerClassName: "pr-5 text-right sticky right-0 z-10 bg-card",
      className: "pr-5 align-top sticky right-0 bg-card",
      cell: (property) => (
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setViewing(property)}
              aria-label={`View ${property.id}`}
              title="View property"
            >
              <Eye aria-hidden="true" />
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon-sm"
              title="Edit property"
            >
              <Link
                href={`/admin/properties/${property.id}/edit`}
                aria-label={`Edit ${property.id}`}
              >
                <Pencil aria-hidden="true" />
              </Link>
            </Button>
            {statusControl(property)}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {filtered.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">
              {properties.length}
            </span>{" "}
            {properties.length === 1 ? "property" : "properties"}
          </p>
          <p className="text-xs text-muted-foreground">
            Change listing availability status
          </p>
        </div>

        <Card className="gap-4 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="admin-property-search" className={filterLabelClass}>
                Search
              </label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="admin-property-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search ID, title, or locality"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="admin-property-transaction"
                className={filterLabelClass}
              >
                Transaction
              </label>
              <NativeSelect
                id="admin-property-transaction"
                value={listingType}
                onChange={(event) => setListingType(event.target.value)}
              >
                <option value="all">All transactions</option>
                <option value="sale">For sale</option>
                <option value="rent">For rent</option>
                <option value="lease">For lease</option>
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <label htmlFor="admin-property-area" className={filterLabelClass}>
                Locality
              </label>
              <NativeSelect
                id="admin-property-area"
                value={areaSlug}
                onChange={(event) => setAreaSlug(event.target.value)}
              >
                <option value="all">All localities</option>
                {areas.map((area) => (
                  <option key={area.slug} value={area.slug}>
                    {area.name}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <label htmlFor="admin-property-type" className={filterLabelClass}>
                Property type
              </label>
              <NativeSelect
                id="admin-property-type"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                <option value="all">All types</option>
                {Object.entries(propertyTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <label htmlFor="admin-property-status" className={filterLabelClass}>
                Status
              </label>
              <NativeSelect
                id="admin-property-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="all">All statuses</option>
                {propertyStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
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
        </Card>
      </div>

      {feedback ? <p role="status" className="mt-4 rounded-lg border border-border p-4 text-sm">{feedback}</p> : null}

      {filtered.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={Search}
          title="No properties match these filters"
          description="Try a different search term, or clear the filters to see the complete catalogue."
          action={
            <Button type="button" variant="outline" onClick={clearFilters}>
              <RotateCcw aria-hidden="true" />
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <div className="mt-4 space-y-3 lg:hidden">
            {filtered.map((property) => (
              <Card key={property.id} className="gap-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] font-semibold tracking-wide text-muted-foreground">
                      {property.id}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {property.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {property.locality} · {propertyTypeLabels[property.type]} ·{" "}
                      {listingTypeLabels[property.listingType]}
                    </p>
                  </div>
                  <AdminPropertyStatusBadge status={property.status} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {formatPrice(property.price, property.listingType)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Updated {formatDate(property.updatedAt)}
                    </p>
                  </div>
                  <VerificationBadge status={property.verificationStatus} />
                </div>

                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setViewing(property)}
                  >
                    <Eye aria-hidden="true" />
                    View
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/properties/${property.id}/edit`}>
                      <Pencil aria-hidden="true" />
                      Edit
                    </Link>
                  </Button>
                  {statusControl(property)}
                </div>
              </Card>
            ))}
          </div>

          <Card className="mt-4 hidden gap-0 overflow-hidden lg:block">
            <AdminDataTable
              rows={filtered}
              columns={columns}
              getRowKey={(property) => property.id}
              caption="Property management"
            />
          </Card>
        </>
      )}

      <AdminModal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing ? viewing.title : "Property preview"}
        description={
          viewing
            ? `${viewing.id} · ${viewing.locality} · ${listingTypeLabels[viewing.listingType]}`
            : undefined
        }
        footer={
          viewing ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Confirm property details before acting.
              </p>
              <Button asChild>
                <Link href={`/admin/properties/${viewing.id}/edit`}>
                  <Pencil aria-hidden="true" />
                  Edit property
                </Link>
              </Button>
            </div>
          ) : null
        }
      >
        {viewing ? (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap gap-2">
              <AdminPropertyStatusBadge status={viewing.status} />
              <VerificationBadge status={viewing.verificationStatus} />
            </div>

            <p className="leading-relaxed text-muted-foreground">
              {viewing.summary}
            </p>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {[
                ["Price", formatPrice(viewing.price, viewing.listingType)],
                ["Property type", propertyTypeLabels[viewing.type]],
                [
                  "Configuration",
                  viewing.configuration
                    ? viewing.configuration.replace("-", " ").toUpperCase()
                    : "Not specified",
                ],
                ["Locality", viewing.locality],
                [
                  "Built-up area",
                  viewing.builtUpAreaSqft
                    ? `${viewing.builtUpAreaSqft.toLocaleString("en-IN")} sq ft`
                    : "Not specified",
                ],
                ["Facing", viewing.facing ?? "Not specified"],
                ["Bedrooms", viewing.bedrooms ?? "Not specified"],
                ["Bathrooms", viewing.bathrooms ?? "Not specified"],
                ["Floor", viewing.floor ?? "Not specified"],
                ["Approval", viewing.approvalStatus ?? "Not specified"],
                ["Brokerage", viewing.brokerage ?? "Not specified"],
                ["Last updated", formatDate(viewing.updatedAt)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-foreground">{value}</dd>
                </div>
              ))}
            </dl>

            <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              Review the property details before publishing or moving it to draft.
            </p>
          </div>
        ) : null}
      </AdminModal>

      <AdminModal open={pendingAction !== null} onClose={() => { if (!saving) setPendingAction(null); }}
        title={pendingAction ? `Change status to ${adminPropertyStatusLabels[pendingAction.status]}?` : "Change status?"}
        footer={<div className="flex gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => setPendingAction(null)}>Cancel</Button><Button type="button" disabled={saving} onClick={confirmStatusAction}>{saving ? "Saving…" : "Confirm"}</Button></div>}>
        <p>{pendingAction?.propertyId} — {pendingAction?.propertyTitle}</p>
        {pendingAction && !["available", "under-offer"].includes(pendingAction.status) ? (
          <p className="mt-2">This listing will no longer be visible on the public website.</p>
        ) : null}
      </AdminModal>


    </div>
  );
}
