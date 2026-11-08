import type { Area } from "@/types/area";
import type { Property } from "@/types/property";

const curatedAreaSlugs = ["madipakkam", "keelkattalai", "pallikaranai", "velachery"];

/** Keep the existing featured area order; place new areas afterwards by slug. */
export function orderPublicAreas(areas: Area[]): Area[] {
  return [...areas].sort((a, b) => {
    const aIndex = curatedAreaSlugs.indexOf(a.slug);
    const bIndex = curatedAreaSlugs.indexOf(b.slug);
    return (aIndex < 0 ? curatedAreaSlugs.length : aIndex) -
      (bIndex < 0 ? curatedAreaSlugs.length : bIndex) || a.slug.localeCompare(b.slug);
  });
}

/** Counts only the public properties returned by the anonymous query. */
export function withPublicPropertyCounts(areas: Area[], properties: Property[]) {
  const counts = new Map<string, number>();
  for (const property of properties) {
    counts.set(property.areaSlug, (counts.get(property.areaSlug) ?? 0) + 1);
  }
  return orderPublicAreas(areas).map((area) => ({
    ...area,
    publicPropertyCount: counts.get(area.slug) ?? 0,
  }));
}
