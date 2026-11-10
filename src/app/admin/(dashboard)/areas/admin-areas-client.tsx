"use client";

import { MapPin, Pencil, Plus, Power, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveBrokerArea, setBrokerAreaActive } from "./actions";

import {
  AdminDataTable,
  type AdminTableColumn,
} from "@/components/admin/data-table";
import { ActionFeedback } from "@/components/admin/action-feedback";
import { AdminModal } from "@/components/admin/modal";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import { AreaForm } from "@/components/forms/area-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AreaWithCounts } from "@/modules/areas/queries";
import type { Area } from "@/types/area";

interface AdminAreasClientProps {
  initialAreas: AreaWithCounts[];
}

export function AdminAreasClient({ initialAreas }: AdminAreasClientProps) {
  const areas = initialAreas;
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AreaWithCounts | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      areas.filter(
        (area) =>
          normalizedQuery.length === 0 ||
          [area.name, area.slug, area.pincode, area.parentArea ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery),
      ),
    [areas, normalizedQuery],
  );

  const activeAreas = areas.filter((area) => area.isActive !== false).length;
  const mappedProperties = areas.reduce(
    (total, area) => total + area.propertyCount,
    0,
  );

  function openCreate() {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(area: AreaWithCounts) {
    setEditing(area);
    setFormError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
  }

  async function handleSubmit(values: Area) {
    if (saving) return;
    setSaving(true); setFormError(null);
    try {
      const result = await saveBrokerArea(values, editing?.slug ?? null);
      if (!result.ok) { setFormError(result.message); return; }
      closeForm(); setFeedback(result.message); router.refresh();
    } catch { setFormError("Unable to save the area. Please try again."); }
    finally { setSaving(false); }
  }

  async function toggleActive(area: AreaWithCounts) {
    if (saving) return;
    setSaving(true);
    try {
      const result = await setBrokerAreaActive(area.slug, area.isActive === false);
      setFeedback(result.message);
      if (result.ok) router.refresh();
    } catch { setFeedback("Unable to update the area. Please try again."); }
    finally { setSaving(false); }
  }

  const columns: Array<AdminTableColumn<AreaWithCounts>> = [
    {
      id: "area",
      header: "Locality",
      headerClassName: "pl-5",
      className: "pl-5 align-top",
      cell: (area) => (
        <div>
          <p className="font-medium text-foreground">{area.name}</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {area.slug}
          </p>
        </div>
      ),
    },
    {
      id: "parent",
      header: "Parent area",
      className: "align-top text-muted-foreground",
      cell: (area) => area.parentArea ?? "Not specified",
    },
    {
      id: "pincode",
      header: "PIN code",
      className: "align-top font-mono text-xs text-muted-foreground",
      cell: (area) => area.pincode,
    },
    {
      id: "properties",
      header: "Properties",
      className: "align-top",
      cell: (area) => (
        <div>
          <p className="text-foreground">
            {area.propertyCount}{" "}
            {area.propertyCount === 1 ? "listing" : "listings"}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {area.publicPropertyCount} public
          </p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      className: "align-top",
      cell: (area) => (
        <Badge variant={area.isActive === false ? "outline" : "success"}>
          {area.isActive === false ? "Inactive" : "Active"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      headerClassName: "pr-5 text-right",
      className: "pr-5 align-top",
      cell: (area) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => openEdit(area)}
            aria-label={`Edit ${area.name}`}
            title="Edit area"
          >
            <Pencil aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={saving}
            onClick={() => toggleActive(area)}
            aria-label={`${area.isActive === false ? "Activate" : "Deactivate"} ${area.name}`}
            title={
              area.isActive === false
                ? "Mark active"
                : "Mark inactive"
            }
          >
            <Power aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total areas"
          value={areas.length}
          description="Localities in the workspace."
          icon={MapPin}
        />
        <StatCard
          label="Active areas"
          value={activeAreas}
          description="Available in public area navigation."
          icon={MapPin}
        />
        <StatCard
          label="Mapped listings"
          value={mappedProperties}
          description="Property records across all areas."
          icon={MapPin}
        />
      </div>

      <div className="mt-4 flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <label htmlFor="area-search" className="sr-only">
              Search areas
            </label>
            <Input
              id="area-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search area, slug, or PIN code"
              className="pl-9"
            />
          </div>
          <Button type="button" disabled={saving} onClick={openCreate}>
            <Plus aria-hidden="true" />
            Add Area
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {areas.length}{" "}
          {areas.length === 1 ? "area" : "areas"}
        </p>
      </div>

      <ActionFeedback message={feedback} className="mt-4" />

      {filtered.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={MapPin}
          title={areas.length === 0 ? "No areas yet" : "No areas match this search"}
          description={areas.length === 0 ? "Add an area to get started." : "Try a different locality name, slug, or PIN code."}
          action={
            <Button type="button" variant="outline" onClick={() => setQuery("")}>
              Clear search
            </Button>
          }
        />
      ) : (
        <>
          <div className="mt-4 space-y-3 lg:hidden">
            {filtered.map((area) => (
              <Card key={area.slug} className="gap-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {area.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {area.slug} · {area.pincode}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {area.parentArea ?? "Not specified"}
                    </p>
                  </div>
                  <Badge
                    variant={area.isActive === false ? "outline" : "success"}
                  >
                    {area.isActive === false ? "Inactive" : "Active"}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">
                  {area.propertyCount}{" "}
                  {area.propertyCount === 1 ? "listing" : "listings"} ·{" "}
                  {area.publicPropertyCount} public
                </p>

                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(area)}
                  >
                    <Pencil aria-hidden="true" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={saving}
            onClick={() => toggleActive(area)}
                  >
                    <Power aria-hidden="true" />
                    {area.isActive === false ? "Mark active" : "Mark inactive"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <Card className="mt-4 hidden gap-0 overflow-hidden lg:block">
            <AdminDataTable
              rows={filtered}
              columns={columns}
              getRowKey={(area) => area.slug}
              caption="Area management"
            />
          </Card>
        </>
      )}

      <AdminModal
        open={formOpen}
        onClose={closeForm}
        title={editing ? `Edit ${editing.name}` : "Add an area"}
        description={
          editing
            ? "Update the area details. Changes affect the public website."
            : "Create an area record for the catalogue."
        }
      >
        {formError ? (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {formError}
          </p>
        ) : null}
        <AreaForm
          key={editing?.slug ?? "new-area"}
          area={editing ?? undefined}
          submitLabel={editing ? "Save changes" : "Add area"}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          saving={saving}
        />
      </AdminModal>


    </div>
  );
}
