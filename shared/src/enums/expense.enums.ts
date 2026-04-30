// Expense-domain enum constants and their derived union types.

export const PAYMENT_STATUSES = ['pending', 'partial', 'paid', 'overdue', 'cancelled'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'upi', 'cheque', 'credit_card'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const FINANCE_SOURCE_TYPES = ['manual', 'vendor', 'venue'] as const;
export type FinanceSourceType = (typeof FINANCE_SOURCE_TYPES)[number];

export const FINANCE_HEADER_STATUSES = ['active', 'closed', 'terminated'] as const;
export type FinanceHeaderStatus = (typeof FINANCE_HEADER_STATUSES)[number];

export const FINANCE_ITEM_SIDES = ['bride', 'groom', 'shared'] as const;
export type FinanceItemSide = (typeof FINANCE_ITEM_SIDES)[number];

export const FINANCE_PAYMENT_DIRECTIONS = ['outflow', 'inflow'] as const;
export type FinancePaymentDirection = (typeof FINANCE_PAYMENT_DIRECTIONS)[number];

export const FINANCE_PAYMENT_STATUSES = [
  'scheduled',
  'posted',
  'cancelled',
  'entered_in_error',
] as const;
export type FinancePaymentStatus = (typeof FINANCE_PAYMENT_STATUSES)[number];

export const FINANCE_PAID_BY_SIDES = ['bride', 'groom', 'shared'] as const;
export type FinancePaidBySide = (typeof FINANCE_PAID_BY_SIDES)[number];

/**
 * Well-known top-level expense / vendor category names.
 * These are the parent-level buckets used for budget tracking.
 */
export const EXPENSE_CATEGORIES = [
  'Venue',
  'Catering',
  'Photography & Videography',
  'Decoration',
  'Entertainment',
  'Attire & Beauty',
  'Invitations & Stationery',
  'Transportation',
  'Accommodation',
  'Jewellery',
  'Mehendi & Rituals',
  'Miscellaneous',
] as const;
export type ExpenseCategoryName = (typeof EXPENSE_CATEGORIES)[number];

/**
 * Full two-level category tree for pan-India weddings.
 * Seeded on first use per user. Users can add custom categories
 * and subcategories on top of this default tree.
 *
 * Parents  = budget-tracking buckets (appear in pie charts / summary cards).
 * Children = specific vendor/expense types (what you pick when adding a vendor or expense).
 */
export const DEFAULT_CATEGORY_TREE: ReadonlyArray<{
  name: string;
  children: ReadonlyArray<string>;
}> = [
  {
    name: 'Venue',
    children: [
      'Wedding Hall / Banquet',
      'Farmhouse / Resort',
      'Hotel Ballroom',
      'Palace / Heritage Venue',
      'Outdoor Garden / Lawn',
      'Community Hall / Dharamshala',
      'Temple / Religious Venue',
      'Tent House / Shamiana',
    ],
  },
  {
    name: 'Catering',
    children: [
      'Main Caterer (Full Service)',
      'Halwai / Sweets & Snacks',
      'Beverage Stall',
      'Live Counters (Chaat, Dosa, etc.)',
      'Breakfast / Brunch Caterer',
      'Ice Cream / Dessert Counter',
      'Dry Fruit & Mithai',
    ],
  },
  {
    name: 'Photography & Videography',
    children: [
      'Photographer',
      'Videographer / Cinematographer',
      'Photo + Video Package',
      'Drone Operator',
      'Photo Booth',
      'Album Design / Studio',
      'Pre-Wedding Shoot',
      'Live Streaming',
    ],
  },
  {
    name: 'Decoration',
    children: [
      'Floral Decorator',
      'Stage / Mandap Decorator',
      'Lighting & Draping',
      'Balloon Decorator',
      'Gate / Entry Decoration',
      'Car Decoration',
      'Theme Decorator',
      'Table Centre-pieces',
    ],
  },
  {
    name: 'Entertainment',
    children: [
      'DJ / Sound System',
      'Live Band / Orchestra',
      'Baraat Band / Brass Band',
      'Dhol Player / Nagada',
      'Sangeet / Dance Choreographer',
      'Anchor / Emcee',
      'Comedian / Performer',
      'Fireworks / Fire Show',
      'Kids Entertainment',
    ],
  },
  {
    name: 'Attire & Beauty',
    children: [
      'Bridal Lehenga / Saree',
      'Groom Sherwani / Suit',
      'Bridal Makeup Artist',
      'Hair Stylist',
      'Family Attire / Coordination',
      'Bridal Accessories',
      'Tailoring / Alterations',
    ],
  },
  {
    name: 'Invitations & Stationery',
    children: [
      'Wedding Cards / Invitations',
      'Digital Invitations',
      'Menu Cards',
      'Thank You Cards',
      'Signage & Banners',
      'Gift Tags & Packaging',
    ],
  },
  {
    name: 'Transportation',
    children: [
      'Bridal Car / Decoration',
      'Bus / Mini-Bus Rental',
      'Tempo Traveller',
      'Horse / Buggy (Ghodi)',
      'Airport / Station Transfers',
      'Logistics & Cargo',
    ],
  },
  {
    name: 'Accommodation',
    children: [
      "Bride's Family Hotel",
      "Groom's Family Hotel",
      'Guest Accommodation',
      'Honeymoon Hotel / Resort',
    ],
  },
  {
    name: 'Jewellery',
    children: [
      'Bridal Gold Jewellery',
      'Kundan / Polki Set',
      'Diamond Jewellery',
      'Silver Jewellery & Articles',
      'Groom Accessories (Sehera, etc.)',
      'Imitation / Fashion Jewellery',
    ],
  },
  {
    name: 'Mehendi & Rituals',
    children: [
      'Pandit / Purohit',
      'Mehendi Artist (Bridal)',
      'Mehendi Artist (Event)',
      'Haldi Ceremony Setup',
      'Sangeet Setup',
      'Sagan / Roka Ceremony',
      'Ring Ceremony Setup',
      'Puja Samagri',
    ],
  },
  {
    name: 'Miscellaneous',
    children: [
      'Gifts & Return Gifts',
      'Flower Garlands & Mala',
      'Generator / Power Backup',
      'Security / Bouncers',
      'Valet Parking',
      'Printing & Misc Stationery',
      'Tips & Gratuities',
      'Taxes & Fees',
    ],
  },
] as const;
