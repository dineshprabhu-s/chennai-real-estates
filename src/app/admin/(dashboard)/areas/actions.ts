"use server";
import { revalidatePath } from "next/cache";
import { requireBroker } from "@/lib/auth/broker";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const validSlug = (value: unknown): value is string => typeof value === "string" && value.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
type Result = { ok: true; message: string } | { ok: false; message: string };
function refresh(oldSlug: string, slug: string): boolean {
  let ok = true;
  const paths = ["/", "/areas", "/properties", "/admin/areas", "/admin/properties", "/admin/properties/new", "/admin/dashboard", `/areas/${oldSlug}`, `/areas/${slug}`];
  for (const path of paths) { try { revalidatePath(path); } catch { ok = false; } }
  try { revalidatePath("/properties/[slug]", "page"); revalidatePath("/admin/properties/[id]/edit", "page"); } catch { ok = false; }
  return ok;
}
export async function saveBrokerArea(input: unknown, originalSlug: unknown): Promise<Result> {
  await requireBroker();
  if (!input || typeof input !== "object" || Array.isArray(input) || (originalSlug !== null && !validSlug(originalSlug))) return { ok: false, message: "Invalid area details." };
  const a = input as Record<string, unknown>;
  if (!validSlug(a.slug) || typeof a.name !== "string" || a.name.trim().length < 3 || a.name.length > 200 || typeof a.pincode !== "string" || !/^\d{6}$/.test(a.pincode) || typeof a.summary !== "string" || a.summary.trim().length < 10 || a.summary.length > 2000 || typeof a.description !== "string" || a.description.trim().length < 20 || a.description.length > 10000 || !Array.isArray(a.highlights) || a.highlights.length > 100 || !a.highlights.every((x) => typeof x === "string" && x.length <= 500) || (a.parentArea !== undefined && (typeof a.parentArea !== "string" || a.parentArea.length > 200)) || typeof a.isActive !== "boolean") return { ok: false, message: "Review the area fields and try again." };
  const row = { slug: a.slug, name: a.name.trim(), pincode: a.pincode, summary: a.summary.trim(), description: a.description.trim(), highlights: a.highlights.map((x: string) => x.trim()).filter(Boolean), parent_area: typeof a.parentArea === "string" ? a.parentArea.trim() || null : null, is_active: a.isActive };
  try {
    const client = await createSupabaseServerClient();
    const query = originalSlug === null ? client.from("areas").insert(row) : client.from("areas").update(row).eq("slug", originalSlug);
    const { data, error } = await query.select("slug").maybeSingle();
    if (error) return { ok: false, message: error.code === "23505" ? "An area with this URL already exists." : "Unable to save the area. Please try again." };
    if (!data) return { ok: false, message: "Area not found. Refresh and try again." };
    const refreshed = refresh(typeof originalSlug === "string" ? originalSlug : row.slug, row.slug);
    return { ok: true, message: refreshed ? "Area saved." : "Area saved, but some pages could not be refreshed." };
  } catch { return { ok: false, message: "Unable to save the area. Please try again." }; }
}
export async function setBrokerAreaActive(slug: unknown, active: unknown): Promise<Result> {
  await requireBroker();
  if (!validSlug(slug) || typeof active !== "boolean") return { ok: false, message: "Invalid area status." };
  try {
    const client = await createSupabaseServerClient();
    const { data, error } = await client.from("areas").update({ is_active: active }).eq("slug", slug).select("slug").maybeSingle();
    if (error) return { ok: false, message: "Unable to update the area. Please try again." };
    if (!data) return { ok: false, message: "Area not found. Refresh and try again." };
    return { ok: true, message: refresh(slug, slug) ? "Area status saved." : "Area status saved, but some pages could not be refreshed." };
  } catch { return { ok: false, message: "Unable to update the area. Please try again." }; }
}
