import { RotateCcw, Search } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  facingOptions,
  listingTypeOptions,
  propertyConfigurationOptions,
  propertyTypeOptions,
} from "@/modules/properties/constants";
import {
  hasActivePropertyFilters,
  type PropertyFilters,
} from "@/modules/properties/filters";
import { cn } from "@/lib/utils";

interface AreaOption {
  slug: string;
  name: string;
}

interface PropertyFiltersFormProps {
  areas: AreaOption[];
  filters: PropertyFilters;
  className?: string;
}

const labelClass =
  "text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase";

export function PropertyFiltersForm({
  areas,
  filters,
  className,
}: PropertyFiltersFormProps) {
  return (
    <form
      action="/properties"
      method="get"
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="filter-q" className={labelClass}>
            Locality or keyword
          </label>
          <Input
            id="filter-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Try Madipakkam, 2 BHK, or a landmark"
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="filter-listing-type" className={labelClass}>
            Transaction
          </label>
          <NativeSelect
            id="filter-listing-type"
            name="listingType"
            defaultValue={filters.listingType ?? ""}
            className="h-10 bg-background"
          >
            <option value="">Sale, rent, or lease</option>
            {listingTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <label htmlFor="filter-area" className={labelClass}>
            Locality
          </label>
          <NativeSelect
            id="filter-area"
            name="areaSlug"
            defaultValue={filters.areaSlug ?? ""}
            className="h-10 bg-background"
          >
            <option value="">All localities</option>
            {areas.map((area) => (
              <option key={area.slug} value={area.slug}>
                {area.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <label htmlFor="filter-category" className={labelClass}>
            Property category
          </label>
          <NativeSelect
            id="filter-category"
            name="category"
            defaultValue={filters.type ?? ""}
            className="h-10 bg-background"
          >
            <option value="">All categories</option>
            {propertyTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <label htmlFor="filter-configuration" className={labelClass}>
            Property type
          </label>
          <NativeSelect
            id="filter-configuration"
            name="configuration"
            defaultValue={filters.configuration ?? ""}
            className="h-10 bg-background"
          >
            <option value="">All configurations</option>
            {propertyConfigurationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <label htmlFor="filter-bedrooms" className={labelClass}>
            Bedrooms
          </label>
          <NativeSelect
            id="filter-bedrooms"
            name="bedrooms"
            defaultValue={filters.bedrooms?.toString() ?? ""}
            className="h-10 bg-background"
          >
            <option value="">Any bedrooms</option>
            <option value="1">1 bedroom</option>
            <option value="2">2 bedrooms</option>
            <option value="3">3 bedrooms</option>
            <option value="4">4+ bedrooms</option>
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <label htmlFor="filter-facing" className={labelClass}>
            Facing
          </label>
          <NativeSelect
            id="filter-facing"
            name="facing"
            defaultValue={filters.facing ?? ""}
            className="h-10 bg-background"
          >
            <option value="">Any facing</option>
            {facingOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <label htmlFor="filter-min-price" className={labelClass}>
            Minimum price (₹)
          </label>
          <Input
            id="filter-min-price"
            name="minPrice"
            type="number"
            min={0}
            step={10000}
            inputMode="numeric"
            defaultValue={filters.minPrice ?? ""}
            placeholder="0"
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="filter-max-price" className={labelClass}>
            Maximum price (₹)
          </label>
          <Input
            id="filter-max-price"
            name="maxPrice"
            type="number"
            min={0}
            step={10000}
            inputMode="numeric"
            defaultValue={filters.maxPrice ?? ""}
            placeholder="No maximum"
            className="h-10"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Price filters use the listed sale, monthly rent, or lease amount.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {hasActivePropertyFilters(filters) ? (
            <Button asChild variant="ghost">
              <Link href="/properties">
                <RotateCcw aria-hidden="true" />
                Clear filters
              </Link>
            </Button>
          ) : null}
          <Button type="submit">
            <Search aria-hidden="true" />
            Apply filters
          </Button>
        </div>
      </div>
    </form>
  );
}
