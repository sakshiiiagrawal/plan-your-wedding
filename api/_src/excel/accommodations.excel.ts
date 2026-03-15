import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GuestForTemplate {
  first_name: string;
  last_name: string | null;
  side: string;
  needs_accommodation: boolean;
}

export interface VenueForTemplate {
  name: string;
}

export interface ParsedAllocation {
  hotel_name: string;
  room_number: string;
  guest_first_name: string;
  guest_last_name: string;
  guest_full_name: string;
  check_in_date: string;
  check_out_date: string;
}

export interface ParsedMultiVenueAllocation extends ParsedAllocation {
  sheet_name: string;
}

export interface AllocationValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SimilarGuest {
  guest: { first_name: string; last_name: string | null; side: string; id: string };
  fullName: string;
  similarity: number;
}

// ---------------------------------------------------------------------------
// Levenshtein / similarity helpers
// ---------------------------------------------------------------------------

function levenshteinDistance(str1: string, str2: string): number {
  const track = Array.from({ length: str2.length + 1 }, () =>
    Array<number>(str1.length + 1).fill(0),
  );
  for (let i = 0; i <= str1.length; i++) track[0]![i] = i;
  for (let j = 0; j <= str2.length; j++) track[j]![0] = j;
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j]![i] = Math.min(
        track[j]![i - 1]! + 1,
        track[j - 1]![i]! + 1,
        track[j - 1]![i - 1]! + indicator,
      );
    }
  }
  return track[str2.length]![str1.length]!;
}

function similarityRatio(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 1.0;
  return (longer.length - levenshteinDistance(longer, shorter)) / longer.length;
}

export function findSimilarGuests(
  searchName: string,
  guestsList: SimilarGuest['guest'][],
  threshold = 0.6,
): SimilarGuest[] {
  const searchLower = searchName.toLowerCase().trim();
  return guestsList
    .map((guest) => {
      const fullName = `${guest.first_name} ${guest.last_name ?? ''}`.trim().toLowerCase();
      return {
        guest,
        fullName: `${guest.first_name} ${guest.last_name ?? ''}`.trim(),
        similarity: similarityRatio(searchLower, fullName),
      };
    })
    .filter((m) => m.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
}

// ---------------------------------------------------------------------------
// Template generation — single hotel
// ---------------------------------------------------------------------------

const ALLOCATION_HEADERS = [
  'Room Number*',
  'Guest 1',
  'Guest 2',
  'Guest 3',
  'Check-in Date*',
  'Check-out Date*',
];
const ALLOCATION_SAMPLE = [
  ['101', 'John Doe', 'Jane Doe', '', '2024-12-15', '2024-12-17'],
  ['102', 'Raj Kumar', '', '', '2024-12-15', '2024-12-18'],
  ['103', 'Khushi Sharma', 'Amit Sharma', 'Ravi Sharma', '2024-12-14', '2024-12-19'],
];
const ALLOCATION_COL_WIDTHS = [
  { wch: 18 },
  { wch: 25 },
  { wch: 25 },
  { wch: 25 },
  { wch: 18 },
  { wch: 18 },
];
const GUEST_LIST_HEADERS = [
  'Full Name (Copy This)',
  'First Name',
  'Last Name',
  'Side',
  'Needs Accommodation',
];
const GUEST_LIST_COL_WIDTHS = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 20 }];

function buildGuestListData(guests: GuestForTemplate[]): string[][] {
  const rows: string[][] = [];
  const brideGuests = guests.filter((g) => g.side === 'bride');
  const groomGuests = guests.filter((g) => g.side === 'groom');

  if (brideGuests.length > 0) {
    rows.push(["=== BRIDE'S SIDE ===", '', '', '', '']);
    brideGuests.forEach((g) => {
      const full = `${g.first_name}${g.last_name ? ' ' + g.last_name : ''}`;
      rows.push([
        full,
        g.first_name,
        g.last_name ?? '',
        'Bride',
        g.needs_accommodation ? 'Yes' : 'No',
      ]);
    });
    rows.push(['', '', '', '', '']);
  }

  if (groomGuests.length > 0) {
    rows.push(["=== GROOM'S SIDE ===", '', '', '', '']);
    groomGuests.forEach((g) => {
      const full = `${g.first_name}${g.last_name ? ' ' + g.last_name : ''}`;
      rows.push([
        full,
        g.first_name,
        g.last_name ?? '',
        'Groom',
        g.needs_accommodation ? 'Yes' : 'No',
      ]);
    });
  }

  if (rows.length === 0) {
    rows.push(['No guests found. Please import guests first on the Guests page.', '', '', '', '']);
  }

  return rows;
}

export function generateRoomAllocationTemplate(
  hotelName: string,
  guests: GuestForTemplate[],
): Buffer {
  const ws1 = XLSX.utils.aoa_to_sheet([ALLOCATION_HEADERS, ...ALLOCATION_SAMPLE]);
  ws1['!cols'] = ALLOCATION_COL_WIDTHS;

  const ws2 = XLSX.utils.aoa_to_sheet([GUEST_LIST_HEADERS, ...buildGuestListData(guests)]);
  ws2['!cols'] = GUEST_LIST_COL_WIDTHS;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Room Allocations');
  XLSX.utils.book_append_sheet(wb, ws2, 'Guest List');
  void hotelName; // included in filename by caller
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

// ---------------------------------------------------------------------------
// Template generation — all venues
// ---------------------------------------------------------------------------

export function generateAllVenuesAllocationTemplate(
  venues: VenueForTemplate[],
  guests: GuestForTemplate[],
): Buffer {
  const wb = XLSX.utils.book_new();

  if (venues.length > 0) {
    venues.forEach((venue, index) => {
      const ws = XLSX.utils.aoa_to_sheet([ALLOCATION_HEADERS, ...ALLOCATION_SAMPLE]);
      ws['!cols'] = ALLOCATION_COL_WIDTHS;
      let sheetName = `${index + 1}. ${venue.name}`;
      if (sheetName.length > 31) sheetName = sheetName.substring(0, 28) + '...';
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
  } else {
    const ws = XLSX.utils.aoa_to_sheet([ALLOCATION_HEADERS, ...ALLOCATION_SAMPLE]);
    ws['!cols'] = ALLOCATION_COL_WIDTHS;
    XLSX.utils.book_append_sheet(wb, ws, 'Room Allocations');
  }

  const wsGuests = XLSX.utils.aoa_to_sheet([GUEST_LIST_HEADERS, ...buildGuestListData(guests)]);
  wsGuests['!cols'] = GUEST_LIST_COL_WIDTHS;
  XLSX.utils.book_append_sheet(wb, wsGuests, 'Guest List');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

const getString = (value: unknown): string => (value != null ? String(value).trim() : '');

function splitName(fullName: string): { first_name: string; last_name: string } {
  if (!fullName.trim()) return { first_name: '', last_name: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0] ?? '', last_name: '' };
  return { first_name: parts[0] ?? '', last_name: parts.slice(1).join(' ') };
}

export function parseRoomAllocationExcel(buffer: Buffer, hotelName: string): ParsedAllocation[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any>[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]!);

  const filtered = data.filter((row) => {
    const room = getString(
      row['Room Number*'] ?? row['Room Number'] ?? row['room_number*'] ?? row['room_number'],
    );
    const g1 = getString(row['Guest 1'] ?? row['guest_1']);
    const ci = getString(
      row['Check-in Date*'] ??
        row['Check-in Date'] ??
        row['check_in_date*'] ??
        row['check_in_date'],
    );
    return room !== '' || g1 !== '' || ci !== '';
  });

  const allocations: ParsedAllocation[] = [];
  filtered.forEach((row) => {
    const roomNumber = getString(
      row['Room Number*'] ?? row['Room Number'] ?? row['room_number*'] ?? row['room_number'],
    );
    const checkInDate = getString(
      row['Check-in Date*'] ??
        row['Check-in Date'] ??
        row['check_in_date*'] ??
        row['check_in_date'],
    );
    const checkOutDate = getString(
      row['Check-out Date*'] ??
        row['Check-out Date'] ??
        row['check_out_date*'] ??
        row['check_out_date'],
    );

    const guestNames = [
      getString(row['Guest 1'] ?? row['guest_1']),
      getString(row['Guest 2'] ?? row['guest_2']),
      getString(row['Guest 3'] ?? row['guest_3']),
    ].filter((g) => g !== '');

    guestNames.forEach((guestFullName) => {
      const { first_name, last_name } = splitName(guestFullName);
      allocations.push({
        hotel_name: hotelName,
        room_number: roomNumber,
        guest_first_name: first_name,
        guest_last_name: last_name,
        guest_full_name: guestFullName,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
      });
    });
  });

  return allocations;
}

export function parseMultiVenueAllocationExcel(
  buffer: Buffer,
  venuesMap: Record<string, { name: string }>,
): ParsedMultiVenueAllocation[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const allAllocations: ParsedMultiVenueAllocation[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    if (
      sheetName.toLowerCase().includes('guest list') ||
      sheetName.toLowerCase().includes('guest_list')
    )
      return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any>[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]!);

    const filtered = data.filter((row) => {
      const room = getString(
        row['Room Number*'] ?? row['Room Number'] ?? row['room_number*'] ?? row['room_number'],
      );
      const g1 = getString(row['Guest 1'] ?? row['guest_1']);
      const ci = getString(
        row['Check-in Date*'] ??
          row['Check-in Date'] ??
          row['check_in_date*'] ??
          row['check_in_date'],
      );
      return room !== '' || g1 !== '' || ci !== '';
    });

    let hotelName = sheetName.replace(/^\d+\.\s*/, '');
    const matchedVenue = Object.values(venuesMap).find(
      (v) =>
        hotelName.toLowerCase().includes(v.name.toLowerCase()) ||
        v.name.toLowerCase().includes(hotelName.toLowerCase()),
    );
    if (matchedVenue) hotelName = matchedVenue.name;

    filtered.forEach((row) => {
      const roomNumber = getString(
        row['Room Number*'] ?? row['Room Number'] ?? row['room_number*'] ?? row['room_number'],
      );
      const checkInDate = getString(
        row['Check-in Date*'] ??
          row['Check-in Date'] ??
          row['check_in_date*'] ??
          row['check_in_date'],
      );
      const checkOutDate = getString(
        row['Check-out Date*'] ??
          row['Check-out Date'] ??
          row['check_out_date*'] ??
          row['check_out_date'],
      );

      const guestNames = [
        getString(row['Guest 1'] ?? row['guest_1']),
        getString(row['Guest 2'] ?? row['guest_2']),
        getString(row['Guest 3'] ?? row['guest_3']),
      ].filter((g) => g !== '');

      guestNames.forEach((guestFullName) => {
        const { first_name, last_name } = splitName(guestFullName);
        allAllocations.push({
          hotel_name: hotelName,
          sheet_name: sheetName,
          room_number: roomNumber,
          guest_first_name: first_name,
          guest_last_name: last_name,
          guest_full_name: guestFullName,
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
        });
      });
    });
  });

  return allAllocations;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateRoomAllocation(allocation: ParsedAllocation): AllocationValidationResult {
  const errors: string[] = [];

  if (!allocation.room_number.trim()) errors.push('Room Number* is REQUIRED and cannot be empty');
  if (!allocation.guest_first_name.trim())
    errors.push('At least one guest is REQUIRED for room allocation');
  if (!allocation.check_in_date.trim())
    errors.push('Check-in Date* is REQUIRED and cannot be empty');
  if (!allocation.check_out_date.trim())
    errors.push('Check-out Date* is REQUIRED and cannot be empty');

  if (allocation.check_in_date.trim() && !DATE_RE.test(allocation.check_in_date.trim())) {
    errors.push('Check-in Date* must be in YYYY-MM-DD format (e.g., 2024-12-15)');
  }
  if (allocation.check_out_date.trim() && !DATE_RE.test(allocation.check_out_date.trim())) {
    errors.push('Check-out Date* must be in YYYY-MM-DD format (e.g., 2024-12-17)');
  }

  if (allocation.check_in_date && allocation.check_out_date) {
    if (new Date(allocation.check_out_date) <= new Date(allocation.check_in_date)) {
      errors.push('Check-out Date* must be after Check-in Date*');
    }
  }

  return { isValid: errors.length === 0, errors };
}
