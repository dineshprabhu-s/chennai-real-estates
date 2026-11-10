"use client";

import { useState, type FormEvent } from "react";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Area } from "@/types/area";

interface AreaFormProps {
  area?: Area;
  submitLabel?: string;
  onSubmit: (area: Area) => void;
  onCancel: () => void;
  saving?: boolean;
}

type FieldErrors = Record<string, string>;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Area fields are validated in the browser and again by the server action.
 */
export function AreaForm({
  area,
  submitLabel = "Save area",
  onSubmit,
  onCancel,
  saving = false,
}: AreaFormProps) {
  const prefix = area ? `edit-area-${area.slug}` : "new-area";
  const [name, setName] = useState(area?.name ?? "");
  const [slug, setSlug] = useState(area?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(area));
  const [isActive, setIsActive] = useState(area?.isActive ?? true);
  const [errors, setErrors] = useState<FieldErrors>({});

  function id(field: string) {
    return `${prefix}-${field}`;
  }

  function errorId(field: string) {
    return `${id(field)}-error`;
  }

  function errorProps(field: string) {
    const error = errors[field];

    return error
      ? { "aria-invalid": true as const, "aria-describedby": errorId(field) }
      : {};
  }

  function handleNameChange(value: string) {
    setName(value);

    if (!slugEdited) {
      setSlug(slugify(value));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const nextErrors: FieldErrors = {};

    const nextName = value("name");
    const nextSlug = slugify(value("slug"));
    const pincode = value("pincode");
    const summary = value("summary");
    const description = value("description");

    if (nextName.length < 3) {
      nextErrors.name = "Enter an area name of at least 3 characters.";
    }

    if (nextSlug.length === 0) {
      nextErrors.slug = "Enter a URL slug using letters, numbers, or hyphens.";
    }

    if (!/^\d{6}$/.test(pincode)) {
      nextErrors.pincode = "Enter a valid six-digit PIN code.";
    }

    if (summary.length < 10) {
      nextErrors.summary = "Add a short summary of at least 10 characters.";
    }

    if (description.length < 20) {
      nextErrors.description = "Add a description of at least 20 characters.";
    }

    setErrors(nextErrors);

    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      document.getElementById(id(firstError))?.focus();
      return;
    }

    const highlights = value("highlights")
      .split(/\r?\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean);

    onSubmit({
      slug: nextSlug,
      name: nextName,
      pincode,
      summary,
      description,
      highlights,
      parentArea: value("parentArea") || undefined,
      isActive,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField
          label="Locality name"
          htmlFor={id("name")}
          required
          error={errors.name}
          errorId={errorId("name")}
        >
          <Input
            id={id("name")}
            name="name"
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder="e.g. Madipakkam"
            {...errorProps("name")}
          />
        </FormField>

        <FormField
          label="URL slug"
          htmlFor={id("slug")}
          hint="Used in public area links"
          required
          error={errors.slug}
          errorId={errorId("slug")}
        >
          <Input
            id={id("slug")}
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value);
            }}
            placeholder="madipakkam"
            {...errorProps("slug")}
          />
        </FormField>

        <FormField
          label="PIN code"
          htmlFor={id("pincode")}
          required
          error={errors.pincode}
          errorId={errorId("pincode")}
        >
          <Input
            id={id("pincode")}
            name="pincode"
            inputMode="numeric"
            maxLength={6}
            defaultValue={area?.pincode}
            placeholder="600091"
            {...errorProps("pincode")}
          />
        </FormField>

        <FormField
          label="Parent area or city"
          htmlFor={id("parentArea")}
          hint="Optional"
        >
          <Input
            id={id("parentArea")}
            name="parentArea"
            defaultValue={area ? (area.parentArea ?? "") : "Chennai"}
            placeholder="Chennai"
          />
        </FormField>
      </div>

      <FormField
        label="Short summary"
        htmlFor={id("summary")}
        hint="Shown on area cards"
        required
        error={errors.summary}
        errorId={errorId("summary")}
      >
        <Textarea
          id={id("summary")}
          name="summary"
          defaultValue={area?.summary}
          placeholder="One or two sentences describing the neighbourhood."
          className="min-h-20"
          {...errorProps("summary")}
        />
      </FormField>

      <FormField
        label="Description"
        htmlFor={id("description")}
        required
        error={errors.description}
        errorId={errorId("description")}
      >
        <Textarea
          id={id("description")}
          name="description"
          defaultValue={area?.description}
          placeholder="Connectivity, schools, everyday conveniences, and who the area suits."
          className="min-h-28"
          {...errorProps("description")}
        />
      </FormField>

      <FormField
        label="Highlights"
        htmlFor={id("highlights")}
        hint="One per line"
      >
        <Textarea
          id={id("highlights")}
          name="highlights"
          defaultValue={area?.highlights.join("\n")}
          placeholder={"Strong rental demand\nWalkable local markets\nEasy access to OMR"}
          className="min-h-24"
        />
      </FormField>

      <label className="flex items-start gap-3 rounded-lg border border-border p-4">
        <input
          type="checkbox"
          name="isActive"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          className="mt-0.5 size-4 rounded border-input accent-primary"
        />
        <span>
          <span className="block text-sm font-medium text-foreground">
            Active area
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
            Inactive areas remain in the admin list but are hidden from public
            area navigation.
          </span>
        </span>
      </label>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : submitLabel}</Button>
      </div>
    </form>
  );
}
