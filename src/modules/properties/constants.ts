import type {
  ListingType,
  PropertyStatus,
  PropertyType,
} from "@/types/property";

export const propertyTypeLabels: Record<PropertyType, string> = {
  apartment: "Apartment",
  "independent-house": "Independent house",
  villa: "Villa",
  plot: "Plot",
};

export const listingTypeLabels: Record<ListingType, string> = {
  sale: "For sale",
  rent: "For rent",
};

export const propertyStatusLabels: Record<PropertyStatus, string> = {
  available: "Available",
  "under-offer": "Under offer",
  sold: "Sold",
  draft: "Draft",
};

export const propertyTypeOptions: ReadonlyArray<{
  value: PropertyType;
  label: string;
}> = [
  { value: "apartment", label: propertyTypeLabels.apartment },
  { value: "independent-house", label: propertyTypeLabels["independent-house"] },
  { value: "villa", label: propertyTypeLabels.villa },
  { value: "plot", label: propertyTypeLabels.plot },
];

export const listingTypeOptions: ReadonlyArray<{
  value: ListingType;
  label: string;
}> = [
  { value: "sale", label: listingTypeLabels.sale },
  { value: "rent", label: listingTypeLabels.rent },
];

export const propertyStatusOptions: ReadonlyArray<{
  value: PropertyStatus;
  label: string;
}> = [
  { value: "available", label: propertyStatusLabels.available },
  { value: "under-offer", label: propertyStatusLabels["under-offer"] },
  { value: "sold", label: propertyStatusLabels.sold },
  { value: "draft", label: propertyStatusLabels.draft },
];
