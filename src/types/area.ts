export interface Area {
  slug: string;
  name: string;
  pincode: string;
  summary: string;
  description: string;
  highlights: string[];
  /** Parent city or locality. Optional because public records may not need it. */
  parentArea?: string;
  isActive?: boolean;
}
