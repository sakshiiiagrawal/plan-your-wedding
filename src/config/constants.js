module.exports = {
  WEDDING_DATE: new Date('2026-11-26T07:00:00+05:30'),
  BRIDE_NAME: 'Sakshi Agrawal',
  GROOM_NAME: 'Ayush Dangwal',
  BRIDE_FAMILY: 'Baniya',
  GROOM_FAMILY: 'Brahmin',

  GUEST_SIDES: ['bride', 'groom', 'mutual'],
  RSVP_STATUSES: ['pending', 'confirmed', 'declined', 'tentative'],
  MEAL_PREFERENCES: ['vegetarian', 'jain', 'vegan', 'non_vegetarian'],
  AGE_GROUPS: ['child', 'adult', 'senior'],
  PAYMENT_STATUSES: ['pending', 'partial', 'paid', 'overdue', 'cancelled'],
  PAYMENT_METHODS: ['cash', 'bank_transfer', 'upi', 'cheque', 'credit_card'],
  TASK_PRIORITIES: ['low', 'medium', 'high', 'urgent'],
  TASK_STATUSES: ['pending', 'in_progress', 'completed', 'cancelled'],
  ROOM_TYPES: ['single', 'double', 'suite', 'family', 'dormitory'],

  VENDOR_CATEGORIES: [
    'caterer',
    'decorator',
    'photographer',
    'videographer',
    'mehendi_artist',
    'makeup_artist',
    'dj',
    'band',
    'florist',
    'pandit',
    'tent_house',
    'lighting',
    'invitation',
    'jeweller',
    'choreographer',
    'transportation',
    'other'
  ],

  BUDGET_CATEGORIES: [
    'Venue',
    'Catering',
    'Decoration',
    'Photography & Videography',
    'Bridal Attire & Jewelry',
    'Groom Attire',
    'Makeup & Mehendi',
    'Music & Entertainment',
    'Invitations & Stationery',
    'Accommodation',
    'Transportation',
    'Gifts & Favors',
    'Pandit & Rituals',
    'Miscellaneous'
  ],

  EVENTS: [
    {
      name: 'Mehendi',
      event_type: 'mehendi',
      event_date: '2026-11-24',
      start_time: '18:00',
      end_time: '23:00',
      dress_code: 'Green/Yellow Traditional',
      theme: 'Floral Garden'
    },
    {
      name: 'Haldi Carnival',
      event_type: 'haldi',
      event_date: '2026-11-25',
      start_time: '09:00',
      end_time: '13:00',
      dress_code: 'Yellow Attire',
      theme: 'Yellow Carnival'
    },
    {
      name: 'Engagement & Sangeet',
      event_type: 'sangeet',
      event_date: '2026-11-25',
      start_time: '18:00',
      end_time: '00:00',
      dress_code: 'Indo-Western/Cocktail',
      theme: 'Starry Night'
    },
    {
      name: 'Wedding Ceremony',
      event_type: 'wedding',
      event_date: '2026-11-26',
      start_time: '07:00',
      end_time: '16:00',
      dress_code: 'Traditional - Red/Maroon',
      theme: 'Royal Indian Wedding'
    }
  ]
};
