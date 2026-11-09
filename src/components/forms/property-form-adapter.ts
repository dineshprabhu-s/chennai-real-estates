/** Explicit adapter; edited field names are collected by the form on change. */
export function adaptPropertyForm(
  data: FormData,
  mode: "create" | "edit",
  edited: ReadonlySet<string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const text = ["title", "summary", "type", "configuration", "listingType", "areaSlug", "locality", "address", "landmark", "floor", "facing", "parking", "furnishing", "approvalStatus", "verificationStatus", "lastVerifiedAt", "brokerage", "brokerageType", "brokerageValue", "listedAt"];
  const optional = new Set(["configuration", "address", "landmark", "floor", "facing", "parking", "furnishing", "approvalStatus", "lastVerifiedAt", "brokerage", "brokerageType", "brokerageValue"]);
  const decimals = ["price", "builtUpAreaSqft", "carpetAreaSqft", "udsSqft", "securityDeposit"];
  const integers = ["bedrooms", "bathrooms", "totalFloors", "buildingAgeYears"];
  const include = (key: string) => mode === "create" ? data.has(key) : edited.has(key) && data.has(key);
  for (const key of text) {
    if (!include(key)) continue;
    const value = data.get(key);
    if (typeof value !== "string") { result[key] = value; continue; }
    result[key] = value === "" && optional.has(key) ? null : value;
  }
  for (const key of decimals) {
    if (!include(key)) continue;
    const value = data.get(key);
    result[key] = value === "" && key !== "price" ? null : value;
  }
  for (const key of integers) {
    if (!include(key)) continue;
    const value = data.get(key);
    result[key] = value === "" ? null : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  }
  for (const key of ["description", "publicDescription", "features"]) {
    if (!include(key)) continue;
    const value = data.get(key);
    result[key] = typeof value === "string" ? (key === "features" ? value.split(",").map((v) => v.trim()).filter(Boolean) : value.trim() ? value.split(/\n\s*\n/).map((v) => v.trim()).filter(Boolean) : []) : value;
  }
  if (include("hasLift")) {
    const value = data.get("hasLift");
    result.hasLift = value === "" ? null : value === "yes" ? true : value === "no" ? false : value;
  }
  for (const key of ["priceNegotiable", "isFeatured"]) {
    if (mode === "create" || edited.has(key)) result[key] = data.has(key);
  }
  // The explicit hidden empty input means a deliberate structured-value clear.
  if (mode === "edit" && edited.has("brokerageType") && data.get("brokerageType") === "none" && data.has("brokerageValue")) result.brokerageValue = null;
  return result;
}
