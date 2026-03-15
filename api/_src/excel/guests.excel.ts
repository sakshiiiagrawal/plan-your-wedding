import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Template generation
// ---------------------------------------------------------------------------

export function generateGuestTemplate(): Buffer {
  const headers = [
    'First Name*',
    'Last Name',
    'Phone',
    'Side*',
    'Relationship',
    'Meal Preference',
    'Needs Accommodation',
    'Needs Pickup',
  ];

  const sampleData = [
    ['John', 'Doe', '+91 9000000001', 'Bride', 'Uncle', 'Vegetarian', 'Yes', 'No'],
    ['Jane', 'Smith', '+91 9000000002', 'Groom', 'Aunt', 'Non Vegetarian', 'No', 'Yes'],
    ['Raj', 'Kumar', '+91 9000000003', 'Bride', 'Friend', 'Jain', 'Yes', 'Yes'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  ws['!cols'] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 10 },
    { wch: 15 },
    { wch: 18 },
    { wch: 20 },
    { wch: 15 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Guests');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export interface ParsedGuest {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  side: string;
  relationship: string;
  meal_preference: string;
  dietary_restrictions: string;
  needs_accommodation: boolean;
  needs_pickup: boolean;
  is_vip: boolean;
  notes: string;
}

export function parseGuestExcel(buffer: Buffer): ParsedGuest[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);

  const getString = (value: unknown): string =>
    value != null ? String(value).trim() : '';

  const parseYesNo = (value: unknown): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const v = value.toLowerCase().trim();
      return v === 'yes' || v === 'true' || v === '1';
    }
    return false;
  };

  const normalizeMealPref = (value: unknown): string => {
    if (!value) return 'vegetarian';
    const v = String(value).toLowerCase().trim();
    if (v.includes('non')) return 'non_vegetarian';
    if (v === 'jain') return 'jain';
    if (v === 'vegan') return 'vegan';
    return 'vegetarian';
  };

  const filtered = data.filter((row) => {
    const firstName = getString(row['First Name*'] ?? row['First Name'] ?? row['first_name*'] ?? row['first_name']);
    const side = getString(row['Side*'] ?? row['Side'] ?? row['side*'] ?? row['side']);
    return firstName !== '' || side !== '';
  });

  return filtered.map((row) => ({
    first_name: getString(row['First Name*'] ?? row['First Name'] ?? row['first_name*'] ?? row['first_name']),
    last_name: getString(row['Last Name'] ?? row['last_name']),
    phone: getString(row['Phone'] ?? row['phone']),
    email: getString(row['Email'] ?? row['email']),
    side: getString(row['Side*'] ?? row['Side'] ?? row['side*'] ?? row['side']).toLowerCase(),
    relationship: getString(row['Relationship'] ?? row['relationship']),
    meal_preference: normalizeMealPref(row['Meal Preference'] ?? row['meal_preference']),
    dietary_restrictions: getString(row['Dietary Restrictions'] ?? row['dietary_restrictions']),
    needs_accommodation: parseYesNo(row['Needs Accommodation'] ?? row['needs_accommodation']),
    needs_pickup: parseYesNo(row['Needs Pickup'] ?? row['needs_pickup']),
    is_vip: parseYesNo(row['Is VIP'] ?? row['is_vip'] ?? false),
    notes: getString(row['Notes'] ?? row['notes']),
  }));
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface GuestValidationResult {
  isValid: boolean;
  errors: string[];
}

const VALID_MEAL_PREFS = ['vegetarian', 'jain', 'vegan', 'non_vegetarian'] as const;

export function validateGuest(guest: ParsedGuest): GuestValidationResult {
  const errors: string[] = [];

  if (!guest.first_name || guest.first_name.trim() === '') {
    errors.push('First Name* is REQUIRED and cannot be empty');
  }

  if (!guest.side || guest.side.trim() === '') {
    errors.push('Side* is REQUIRED and cannot be empty');
  } else if (!['bride', 'groom'].includes(guest.side.toLowerCase())) {
    errors.push('Side* must be exactly "Bride" or "Groom"');
  }

  if (
    guest.meal_preference &&
    guest.meal_preference.trim() !== '' &&
    !(VALID_MEAL_PREFS as readonly string[]).includes(guest.meal_preference.toLowerCase())
  ) {
    errors.push('Meal Preference must be one of: Vegetarian, Jain, Vegan, Non Vegetarian');
  }

  return { isValid: errors.length === 0, errors };
}
