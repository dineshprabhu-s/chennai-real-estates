"use client";

import { LockKeyhole } from "lucide-react";
import type { FormEvent } from "react";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  listingTypeOptions,
  propertyStatusOptions,
  propertyTypeOptions,
} from "@/modules/properties/constants";
import type { Property } from "@/types/property";

interface AreaOption {
  slug: string;
  name: string;
}

interface PropertyFormProps {
  areas: AreaOption[];
  property?: Property;
  submitLabel?: string;
}

/**
 * UI preview of the property form. The save action is intentionally disabled
 * until the data layer and validation are implemented.
 */
export function PropertyForm({
  areas,
  property,
  submitLabel = "Save property",
}: PropertyFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  const fieldPrefix = property ? `edit-${property.id}` : "new-property";

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <section className="space-y-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Listing basics
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The public-facing title, summary, and property type.
          </p>
        </div>

        <FormField label="Title" htmlFor={`${fieldPrefix}-title`} required>
          <Input
            id={`${fieldPrefix}-title`}
            name="title"
            defaultValue={property?.title}
            placeholder="e.g. Sunlit 3BHK apartment with covered parking"
            required
          />
        </FormField>

        <FormField
          label="Short summary"
          htmlFor={`${fieldPrefix}-summary`}
          hint="Shown on listing cards"
          required
        >
          <Textarea
            id={`${fieldPrefix}-summary`}
            name="summary"
            defaultValue={property?.summary}
            placeholder="One or two sentences that capture what makes this listing worth a look."
            className="min-h-20"
            required
          />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Property type" htmlFor={`${fieldPrefix}-type`}>
            <NativeSelect
              id={`${fieldPrefix}-type`}
              name="type"
              defaultValue={property?.type ?? "apartment"}
            >
              {propertyTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField label="Listing type" htmlFor={`${fieldPrefix}-listing-type`}>
            <NativeSelect
              id={`${fieldPrefix}-listing-type`}
              name="listingType"
              defaultValue={property?.listingType ?? "sale"}
            >
              {listingTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField label="Status" htmlFor={`${fieldPrefix}-status`}>
            <NativeSelect
              id={`${fieldPrefix}-status`}
              name="status"
              defaultValue={property?.status ?? "draft"}
            >
              {propertyStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        </div>
      </section>

      <section className="space-y-5 border-t border-border pt-7">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Price and location
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Prices are entered in Indian rupees. Rental prices are monthly.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Price (INR)" htmlFor={`${fieldPrefix}-price`} required>
            <Input
              id={`${fieldPrefix}-price`}
              name="price"
              type="number"
              min={0}
              step={1000}
              defaultValue={property?.price}
              placeholder="8500000"
              required
            />
          </FormField>

          <FormField label="Area" htmlFor={`${fieldPrefix}-area`} required>
            <NativeSelect
              id={`${fieldPrefix}-area`}
              name="areaSlug"
              defaultValue={property?.areaSlug ?? areas[0]?.slug ?? ""}
              required
            >
              {areas.map((area) => (
                <option key={area.slug} value={area.slug}>
                  {area.name}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField
            label="Built-up area"
            htmlFor={`${fieldPrefix}-built-up-area`}
            hint="sq ft"
            required
          >
            <Input
              id={`${fieldPrefix}-built-up-area`}
              name="builtUpAreaSqft"
              type="number"
              min={0}
              defaultValue={property?.builtUpAreaSqft ?? undefined}
              placeholder="1250"
              required
            />
          </FormField>
        </div>
      </section>

      <section className="space-y-5 border-t border-border pt-7">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Layout and features
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Leave bedrooms and bathrooms blank for plots.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Bedrooms" htmlFor={`${fieldPrefix}-bedrooms`}>
            <Input
              id={`${fieldPrefix}-bedrooms`}
              name="bedrooms"
              type="number"
              min={0}
              defaultValue={property?.bedrooms ?? undefined}
              placeholder="3"
            />
          </FormField>

          <FormField label="Bathrooms" htmlFor={`${fieldPrefix}-bathrooms`}>
            <Input
              id={`${fieldPrefix}-bathrooms`}
              name="bathrooms"
              type="number"
              min={0}
              defaultValue={property?.bathrooms ?? undefined}
              placeholder="2"
            />
          </FormField>
        </div>

        <FormField
          label="Features"
          htmlFor={`${fieldPrefix}-features`}
          hint="Separate with commas"
        >
          <Textarea
            id={`${fieldPrefix}-features`}
            name="features"
            defaultValue={property?.features.join(", ")}
            placeholder="Covered parking, Lift, Piped gas connection"
          />
        </FormField>

        <FormField label="Description" htmlFor={`${fieldPrefix}-description`}>
          <Textarea
            id={`${fieldPrefix}-description`}
            name="description"
            defaultValue={property?.description.join("\n\n")}
            placeholder="Describe the layout, condition, and location advantages."
            className="min-h-32"
          />
        </FormField>

        <label className="flex items-start gap-3 rounded-lg border border-border p-4">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={property?.isFeatured ?? false}
            className="mt-0.5 size-4 rounded border-input accent-primary"
          />
          <span>
            <span className="block text-sm font-medium text-foreground">
              Feature this listing
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              Featured listings may appear on the homepage and area pages.
            </span>
          </span>
        </label>
      </section>

      <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
        <Button type="submit" disabled>
          <LockKeyhole aria-hidden="true" />
          {submitLabel}
        </Button>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Preview only. Saving will be enabled once the property data layer and
          validation are connected.
        </p>
      </div>
    </form>
  );
}
