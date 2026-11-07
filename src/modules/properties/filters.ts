import {
  facingOptions,
  listingTypeOptions,
  propertyConfigurationOptions,
  propertyTypeOptions,
} from "@/modules/properties/constants";
import type {
  Facing,
  ListingType,
  Property,
  PropertyConfiguration,
  PropertyType,
} from "@/types/property";

export type PropertySearchParams = Record<
  string,
  string | string[] | undefined
>;

export interface PropertyFilters {
  q: string;
  listingType: ListingType | null;
  areaSlug: string | null;
  type: PropertyType | null;
  configuration: PropertyConfiguration | null;
  bedrooms: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  facing: Facing | null;
}

export const emptyPropertyFilters: PropertyFilters = {
  q: "",
  listingType: null,
  areaSlug: null,
  type: null,
  configuration: null,
  bedrooms: null,
  minPrice: null,
  maxPrice: null,
  facing: null,
};

function firstValue(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;

  return raw?.trim() || undefined;
}

function parseOption<T extends string>(
  value: string | undefined,
  options: ReadonlyArray<{ value: T }>,
): T | null {
  if (!value) {
    return null;
  }

  return options.find((option) => option.value === value)?.value ?? null;
}

function parsePrice(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value.replace(/,/g, ""));

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseBedrooms(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 4
    ? parsed
    : null;
}

export function parsePropertyFilters(
  searchParams: PropertySearchParams,
): PropertyFilters {
  return {
    q: firstValue(searchParams.q)?.slice(0, 120) ?? "",
    listingType: parseOption(
      firstValue(searchParams.listingType),
      listingTypeOptions,
    ),
    areaSlug: firstValue(searchParams.areaSlug) ?? null,
    type: parseOption(firstValue(searchParams.category), propertyTypeOptions),
    configuration: parseOption(
      firstValue(searchParams.configuration),
      propertyConfigurationOptions,
    ),
    bedrooms: parseBedrooms(firstValue(searchParams.bedrooms)),
    minPrice: parsePrice(firstValue(searchParams.minPrice)),
    maxPrice: parsePrice(firstValue(searchParams.maxPrice)),
    facing: parseOption(firstValue(searchParams.facing), facingOptions),
  };
}

export function filterProperties(
  properties: Property[],
  filters: PropertyFilters,
): Property[] {
  const query = filters.q.toLowerCase();

  return properties.filter((property) => {
    if (filters.listingType && property.listingType !== filters.listingType) {
      return false;
    }

    if (filters.areaSlug && property.areaSlug !== filters.areaSlug) {
      return false;
    }

    if (filters.type && property.type !== filters.type) {
      return false;
    }

    if (
      filters.configuration &&
      property.configuration !== filters.configuration
    ) {
      return false;
    }

    if (filters.facing && property.facing !== filters.facing) {
      return false;
    }

    if (filters.bedrooms !== null) {
      if (property.bedrooms === null) {
        return false;
      }

      const bedroomsMatch =
        filters.bedrooms === 4
          ? property.bedrooms >= 4
          : property.bedrooms === filters.bedrooms;

      if (!bedroomsMatch) {
        return false;
      }
    }

    if (filters.minPrice !== null && property.price < filters.minPrice) {
      return false;
    }

    if (filters.maxPrice !== null && property.price > filters.maxPrice) {
      return false;
    }

    if (query) {
      const searchable = [
        property.id,
        property.title,
        property.summary,
        property.locality,
        property.areaSlug,
        property.landmark ?? "",
      ]
        .join(" ")
        .toLowerCase();

      if (!searchable.includes(query)) {
        return false;
      }
    }

    return true;
  });
}

export function hasActivePropertyFilters(filters: PropertyFilters): boolean {
  return countActivePropertyFilters(filters) > 0;
}

export function countActivePropertyFilters(filters: PropertyFilters): number {
  const values = [
    filters.q,
    filters.listingType,
    filters.areaSlug,
    filters.type,
    filters.configuration,
    filters.bedrooms,
    filters.minPrice,
    filters.maxPrice,
    filters.facing,
  ];

  return values.filter((value) => value !== null && value !== "").length;
}
