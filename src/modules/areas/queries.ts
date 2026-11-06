import { demoAreas } from "@/modules/areas/data/demo-areas";
import {
  getAllProperties,
  getPublicProperties,
} from "@/modules/properties/queries";
import type { Area } from "@/types/area";

export interface AreaWithCounts extends Area {
  propertyCount: number;
  publicPropertyCount: number;
}

function withCounts(areas: Area[]): AreaWithCounts[] {
  const allProperties = getAllProperties();
  const publicProperties = getPublicProperties();

  return areas.map((area) => ({
    ...area,
    propertyCount: allProperties.filter(
      (property) => property.areaSlug === area.slug,
    ).length,
    publicPropertyCount: publicProperties.filter(
      (property) => property.areaSlug === area.slug,
    ).length,
  }));
}

export function getAreasWithCounts(): AreaWithCounts[] {
  return withCounts([...demoAreas]);
}

export function getPublicAreasWithCounts(): AreaWithCounts[] {
  return withCounts([...demoAreas]);
}

export function getAreaBySlug(slug: string): Area | undefined {
  return demoAreas.find((area) => area.slug === slug);
}

export function getAreaWithCounts(slug: string): AreaWithCounts | undefined {
  return getAreasWithCounts().find((area) => area.slug === slug);
}
