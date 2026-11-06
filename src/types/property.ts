export type PropertyType =
  | "apartment"
  | "independent-house"
  | "villa"
  | "plot";

export type ListingType = "sale" | "rent";

export type PropertyStatus = "available" | "under-offer" | "sold" | "draft";

export interface Property {
  id: string;
  slug: string;
  title: string;
  /** Short one-line summary used on cards and metadata. */
  summary: string;
  /** Paragraphs rendered on the property detail page. */
  description: string[];
  type: PropertyType;
  listingType: ListingType;
  status: PropertyStatus;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  builtUpAreaSqft: number;
  areaSlug: string;
  /** Display label for the area, e.g. "Madipakkam". */
  locality: string;
  features: string[];
  isFeatured: boolean;
  listedAt: string;
  updatedAt: string;
}
