// Vendor-domain enum constants and their derived union types.

export const VENDOR_CATEGORY_LABELS = {
  caterer: 'Catering',
  decorator: 'Decoration',
  photographer: 'Photography',
  videographer: 'Videography',
  mehendi_artist: 'Mehendi Artist',
  makeup_artist: 'Makeup Artist',
  dj: 'DJ',
  band: 'Band',
  florist: 'Florist',
  pandit: 'Pandit',
  tent_house: 'Tent House',
  lighting: 'Lighting',
  invitation: 'Invitations & Stationery',
  jeweller: 'Jewellery',
  choreographer: 'Choreographer',
  transportation: 'Transportation',
  other: 'Other',
} as const;

export type VendorCategory = keyof typeof VENDOR_CATEGORY_LABELS;

export const VENDOR_CATEGORIES = Object.keys(VENDOR_CATEGORY_LABELS) as [
  VendorCategory,
  ...VendorCategory[],
];
