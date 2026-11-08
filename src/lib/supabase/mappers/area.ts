import type { PublicAreaRow } from "@/lib/supabase/database.types";
import type { Area } from "@/types/area";

export function mapPublicArea(row: PublicAreaRow): Area {
  return {
    slug: row.slug, name: row.name, pincode: row.pincode, summary: row.summary,
    description: row.description, highlights: row.highlights,
    parentArea: row.parent_area ?? undefined, isActive: row.is_active,
  };
}
