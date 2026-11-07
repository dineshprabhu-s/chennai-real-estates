import type {
  ApprovalStatus,
  BrokerageType,
  Facing,
  FurnishingStatus,
  ListingType,
  PropertyConfiguration,
  PropertyStatus,
  PropertyType,
  VerificationStatus,
} from "@/types/property";

export const propertyTypeLabels: Record<PropertyType, string> = {
  apartment: "Apartment",
  "independent-house": "Independent house",
  villa: "Villa",
  plot: "Plot",
};

export const propertyConfigurationLabels: Record<
  PropertyConfiguration,
  string
> = {
  "1-rk": "1 RK",
  "1-bhk": "1 BHK",
  "2-bhk": "2 BHK",
  "3-bhk": "3 BHK",
  "4-bhk": "4 BHK",
};

export const listingTypeLabels: Record<ListingType, string> = {
  sale: "For sale",
  rent: "For rent",
  lease: "For lease",
};

export const propertyStatusLabels: Record<PropertyStatus, string> = {
  available: "Available",
  "under-offer": "Under offer",
  sold: "Sold",
  draft: "Draft",
  unavailable: "Unavailable",
  expired: "Expired",
};

/** Broker-facing wording. Underlying status values stay consistent. */
export const adminPropertyStatusLabels: Record<PropertyStatus, string> = {
  available: "Available",
  "under-offer": "Under negotiation",
  sold: "Closed",
  draft: "Draft",
  unavailable: "Unavailable",
  expired: "Expired",
};

export const facingLabels: Record<Facing, string> = {
  north: "North",
  south: "South",
  east: "East",
  west: "West",
  "north-east": "North-east",
  "north-west": "North-west",
  "south-east": "South-east",
  "south-west": "South-west",
};

export const furnishingLabels: Record<FurnishingStatus, string> = {
  unfurnished: "Unfurnished",
  "semi-furnished": "Semi-furnished",
  furnished: "Furnished",
};

export const approvalStatusLabels: Record<ApprovalStatus, string> = {
  approved: "Approved",
  unapproved: "Unapproved",
  "not-applicable": "Not applicable",
};

export const approvalStatusOptions: ReadonlyArray<{
  value: ApprovalStatus;
  label: string;
}> = [
  { value: "unapproved", label: approvalStatusLabels.unapproved },
  { value: "approved", label: approvalStatusLabels.approved },
  { value: "not-applicable", label: approvalStatusLabels["not-applicable"] },
];

export const verificationStatusLabels: Record<VerificationStatus, string> = {
  sample: "Sample / unverified",
  "broker-confirmed": "Broker confirmed",
};

export const verificationStatusOptions: ReadonlyArray<{
  value: VerificationStatus;
  label: string;
}> = [
  { value: "sample", label: verificationStatusLabels.sample },
  {
    value: "broker-confirmed",
    label: verificationStatusLabels["broker-confirmed"],
  },
];

export const brokerageTypeLabels: Record<BrokerageType, string> = {
  percentage: "Percentage of value",
  fixed: "Fixed amount",
  none: "No brokerage",
};

export const brokerageTypeOptions: ReadonlyArray<{
  value: BrokerageType;
  label: string;
}> = [
  { value: "percentage", label: brokerageTypeLabels.percentage },
  { value: "fixed", label: brokerageTypeLabels.fixed },
  { value: "none", label: brokerageTypeLabels.none },
];

export const furnishingOptions: ReadonlyArray<{
  value: FurnishingStatus;
  label: string;
}> = Object.entries(furnishingLabels).map(([value, label]) => ({
  value: value as FurnishingStatus,
  label,
}));

export const propertyTypeOptions: ReadonlyArray<{
  value: PropertyType;
  label: string;
}> = [
  { value: "apartment", label: propertyTypeLabels.apartment },
  { value: "independent-house", label: propertyTypeLabels["independent-house"] },
  { value: "villa", label: propertyTypeLabels.villa },
  { value: "plot", label: propertyTypeLabels.plot },
];

export const propertyConfigurationOptions: ReadonlyArray<{
  value: PropertyConfiguration;
  label: string;
}> = [
  { value: "1-rk", label: propertyConfigurationLabels["1-rk"] },
  { value: "1-bhk", label: propertyConfigurationLabels["1-bhk"] },
  { value: "2-bhk", label: propertyConfigurationLabels["2-bhk"] },
  { value: "3-bhk", label: propertyConfigurationLabels["3-bhk"] },
  { value: "4-bhk", label: propertyConfigurationLabels["4-bhk"] },
];

export const listingTypeOptions: ReadonlyArray<{
  value: ListingType;
  label: string;
}> = [
  { value: "sale", label: listingTypeLabels.sale },
  { value: "rent", label: listingTypeLabels.rent },
  { value: "lease", label: listingTypeLabels.lease },
];

export const facingOptions: ReadonlyArray<{
  value: Facing;
  label: string;
}> = (Object.keys(facingLabels) as Facing[]).map((value) => ({
  value,
  label: facingLabels[value],
}));

export const propertyStatusOptions: ReadonlyArray<{
  value: PropertyStatus;
  label: string;
}> = [
  { value: "draft", label: adminPropertyStatusLabels.draft },
  { value: "available", label: adminPropertyStatusLabels.available },
  { value: "under-offer", label: adminPropertyStatusLabels["under-offer"] },
  { value: "sold", label: adminPropertyStatusLabels.sold },
  { value: "unavailable", label: adminPropertyStatusLabels.unavailable },
  { value: "expired", label: adminPropertyStatusLabels.expired },
];

/** Contextual price label for cards and detail pages. */
export function getListingPriceLabel(listingType: ListingType): string {
  switch (listingType) {
    case "sale":
      return "Guide price";
    case "rent":
      return "Monthly rent";
    case "lease":
      return "Lease amount";
  }
}
