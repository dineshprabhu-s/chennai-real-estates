import { demoProperties } from "@/modules/properties/data/demo-properties";
import type { Property, PropertyStatus } from "@/types/property";

const publicStatuses: ReadonlySet<PropertyStatus> = new Set([
  "available",
  "under-offer",
]);

/**
 * Demo data access layer.
 *
 * These functions are intentionally synchronous and in-memory for the
 * foundation build. Their signatures can become async when the Supabase
 * repository is introduced without changing page-level intent.
 */
export function getAllProperties(): Property[] {
  return [...demoProperties];
}

export function getPublicProperties(): Property[] {
  return getAllProperties().filter((property) =>
    publicStatuses.has(property.status),
  );
}

export function getFeaturedProperties(limit = 3): Property[] {
  return getPublicProperties()
    .filter((property) => property.isFeatured)
    .slice(0, Math.max(0, limit));
}

export function getPropertyBySlug(slug: string): Property | undefined {
  return getPublicProperties().find((property) => property.slug === slug);
}

export function getPropertyById(id: string): Property | undefined {
  return getAllProperties().find((property) => property.id === id);
}

export function getPublicPropertyById(id: string): Property | undefined {
  return getPublicProperties().find((property) => property.id === id);
}

export function getPropertiesByArea(areaSlug: string): Property[] {
  return getPublicProperties().filter(
    (property) => property.areaSlug === areaSlug,
  );
}

export function getRelatedProperties(
  property: Property,
  limit = 3,
): Property[] {
  return getPublicProperties()
    .filter(
      (candidate) =>
        candidate.id !== property.id &&
        candidate.areaSlug === property.areaSlug,
    )
    .sort((a, b) => {
      const typeScore =
        Number(b.type === property.type) - Number(a.type === property.type);

      return typeScore || b.updatedAt.localeCompare(a.updatedAt);
    })
    .slice(0, Math.max(0, limit));
}

export interface PropertyStats {
  total: number;
  available: number;
  underOffer: number;
  featured: number;
}

export function getPropertyStats(): PropertyStats {
  const properties = getAllProperties();

  return {
    total: properties.length,
    available: properties.filter((property) => property.status === "available")
      .length,
    underOffer: properties.filter(
      (property) => property.status === "under-offer",
    ).length,
    featured: properties.filter((property) => property.isFeatured).length,
  };
}
