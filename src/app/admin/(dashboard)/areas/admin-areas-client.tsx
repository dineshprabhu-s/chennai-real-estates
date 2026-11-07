"use client";

import { MapPin, Pencil, Plus, Power, Search } from "lucide-react";
import { useMemo, useState } from "react";

import {
  AdminDataTable,
  type AdminTableColumn,
} from "@/components/admin/data-table";
import { DemoFeedback } from "@/components/admin/demo-feedback";
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
  const [areas, setAreas] = useState(initialAreas);
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

  function handleSubmit(values: Area) {
    const duplicate = areas.some(
      (area) => area.slug === values.slug && area.slug !== editing?.slug,
    );

    if (duplicate) {
      setFormError(
        `The slug "${values.slug}" already belongs to another demo area. Choose a different slug.`,
      );
      return;
    }

    if (editing) {
      setAreas((current) =>
        current.map((area) =>
          area.slug === editing.slug
            ? {
                ...area,
                ...values,
                propertyCount: area.propertyCount,
                publicPropertyCount: area.publicPropertyCount,
              }
            : area,
        ),
      );
      setFeedback(
        `${values.name} was updated in this browser preview only. The public area pages and database are unchanged.`,
      );
    } else {
      setAreas((current) => [
        ...current,
        { ...values, propertyCount: 0, publicPropertyCount: 0 },
      ]);
      setFeedback(
        `${values.name} was added to this browser preview only. No area record was stored, and it does not appear on public pages.`,
      );
    }

    closeForm();
  }

  function toggleActive(area: AreaWithCounts) {
    const nextActive = area.isActive === false;

    setAreas((current) =>
      current.map((row) =>
        row.slug === area.slug ? { ...row, isActive: nextActive } : row,
      ),
    );
    setFeedback(
      `${area.name} is marked ${nextActive ? "active" : "inactive"} in this browser preview only. No data was saved.`,
    );
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
      cell: (area) => area.parentArea ?? "Chennai",
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
            onClick={() => toggleActive(area)}
            aria-label={`${area.isActive === false ? "Activate" : "Deactivate"} ${area.name} (demo)`}
            title={
              area.isActive === false
                ? "Mark active (demo)"
                : "Mark inactive (demo)"
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
          description="Demo localities available in the workspace."
          icon={MapPin}
        />
        <StatCard
          label="Active areas"
          value={activeAreas}
          description="Shown as active in this preview."
          icon={MapPin}
        />
        <StatCard
          label="Mapped listings"
          value={mappedProperties}
          description="Property records across every demo area."
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
          <Button type="button" onClick={openCreate}>
            <Plus aria-hidden="true" />
            Add Area
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {areas.length}{" "}
          {areas.length === 1 ? "area" : "areas"} · Add and edit actions are
          demo-only
        </p>
      </div>

      <DemoFeedback message={feedback} className="mt-4" />

      {filtered.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={MapPin}
          title="No areas match this search"
          description="Try a different locality name, slug, or PIN code."
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
                      {area.parentArea ?? "Chennai"}
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
            ? "Update the demo area details. Changes stay in this browser session."
            : "Create a demo area record. Nothing is saved or published publicly."
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
          submitLabel={editing ? "Save changes (demo)" : "Add area (demo)"}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      </AdminModal>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Area records are seeded demo data. Adding, editing, or deactivating an
        area does not change the public website, and no database write occurs.
      </p>
    </div>
  );
}
