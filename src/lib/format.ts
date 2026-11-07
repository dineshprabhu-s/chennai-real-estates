import type { ListingType } from "@/types/property";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-IN");

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

function trimDecimal(value: number): string {
  const rounded = Math.round(value * 100) / 100;

  return Number.isInteger(rounded)
    ? rounded.toString()
    : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

/** Full Indian currency formatting, e.g. ₹1,25,00,000. */
export function formatCurrency(amount: number): string {
  return inrFormatter.format(amount);
}

/** Compact Indian pricing for cards, e.g. ₹1.25 Cr or ₹28 L. */
export function formatCompactCurrency(amount: number): string {
  if (amount >= 1_00_00_000) {
    return `₹${trimDecimal(amount / 1_00_00_000)} Cr`;
  }

  if (amount >= 1_00_000) {
    return `₹${trimDecimal(amount / 1_00_000)} L`;
  }

  return formatCurrency(amount);
}

export function formatPrice(
  amount: number,
  listingType: ListingType = "sale",
): string {
  const price = formatCompactCurrency(amount);

  return listingType === "rent" ? `${price}/mo` : price;
}

export function formatFullPrice(
  amount: number,
  listingType: ListingType = "sale",
): string {
  const price = formatCurrency(amount);

  return listingType === "rent" ? `${price} per month` : price;
}

/** Label for areas that may be missing from a source listing. */
export function formatOptionalArea(
  squareFeet: number | null | undefined,
): string | null {
  return squareFeet === null || squareFeet === undefined
    ? null
    : formatArea(squareFeet);
}

export function formatArea(squareFeet: number): string {
  return `${numberFormatter.format(squareFeet)} sq ft`;
}

export function formatDate(date: string): string {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return dateFormatter.format(parsed);
}
