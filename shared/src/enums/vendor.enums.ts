// Vendor-domain enum constants and their derived union types.

export const VENDOR_CATEGORIES = [
  "caterer",
  "decorator",
  "photographer",
  "videographer",
  "mehendi_artist",
  "makeup_artist",
  "dj",
  "band",
  "florist",
  "pandit",
  "tent_house",
  "lighting",
  "invitation",
  "jeweller",
  "choreographer",
  "transportation",
  "other",
] as const;
export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];
