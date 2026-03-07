const XLSX = require('xlsx');

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching guest names
 */
const levenshteinDistance = (str1, str2) => {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator, // substitution
      );
    }
  }
  return track[str2.length][str1.length];
};

/**
 * Calculate similarity ratio between two strings (0 to 1)
 */
const similarityRatio = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / parseFloat(longer.length);
};

/**
 * Find similar guest names from a list
 */
const findSimilarGuests = (searchName, guestsList, threshold = 0.6) => {
  const searchLower = searchName.toLowerCase().trim();

  const matches = guestsList.map(guest => {
    const guestFullName = `${guest.first_name} ${guest.last_name || ''}`.trim().toLowerCase();
    const similarity = similarityRatio(searchLower, guestFullName);

    return {
      guest,
      fullName: `${guest.first_name} ${guest.last_name || ''}`.trim(),
      similarity
    };
  })
  .filter(match => match.similarity >= threshold)
  .sort((a, b) => b.similarity - a.similarity)
  .slice(0, 3); // Top 3 matches

  return matches;
};

/**
 * Generate Excel template for guest import
 */
const generateGuestTemplate = () => {
  const headers = [
    'First Name*',
    'Last Name',
    'Phone',
    'Side*',
    'Relationship',
    'Meal Preference',
    'Needs Accommodation',
    'Needs Pickup'
  ];

  const sampleData = [
    [
      'John',
      'Doe',
      '+91 9876543210',
      'Bride',
      'Uncle',
      'Vegetarian',
      'Yes',
      'No'
    ],
    [
      'Jane',
      'Smith',
      '+91 9876543211',
      'Groom',
      'Aunt',
      'Non Vegetarian',
      'No',
      'Yes'
    ],
    [
      'Raj',
      'Kumar',
      '+91 9876543212',
      'Bride',
      'Friend',
      'Jain',
      'Yes',
      'Yes'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    ...sampleData
  ]);

  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // First Name
    { wch: 15 }, // Last Name
    { wch: 18 }, // Phone
    { wch: 10 }, // Side
    { wch: 15 }, // Relationship
    { wch: 18 }, // Meal Preference
    { wch: 20 }, // Needs Accommodation
    { wch: 15 }  // Needs Pickup
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Guests');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Generate Excel template for room allocation import
 * Hotel-specific template with guest list reference
 */
const generateRoomAllocationTemplate = (hotelName = 'Hotel Name', guestsList = []) => {
  // ========== SHEET 1: Room Allocations ==========
  const headers = [
    'Room Number*',
    'Guest 1',
    'Guest 2',
    'Guest 3',
    'Check-in Date*',
    'Check-out Date*'
  ];

  const sampleData = [
    [
      '101',
      'John Doe',
      'Jane Doe',
      '',
      '2024-12-15',
      '2024-12-17'
    ],
    [
      '102',
      'Raj Kumar',
      '',
      '',
      '2024-12-15',
      '2024-12-18'
    ],
    [
      '103',
      'Priya Sharma',
      'Amit Sharma',
      'Ravi Sharma',
      '2024-12-14',
      '2024-12-19'
    ]
  ];

  const ws1 = XLSX.utils.aoa_to_sheet([
    headers,
    ...sampleData
  ]);

  // Set column widths for allocations sheet
  ws1['!cols'] = [
    { wch: 18 }, // Room Number
    { wch: 25 }, // Guest 1
    { wch: 25 }, // Guest 2
    { wch: 25 }, // Guest 3
    { wch: 18 }, // Check-in Date
    { wch: 18 }  // Check-out Date
  ];

  // ========== SHEET 2: Guest List (Reference) ==========
  const guestListHeaders = [
    'Full Name (Copy This)',
    'First Name',
    'Last Name',
    'Side',
    'Needs Accommodation'
  ];

  // Group guests by side
  const brideGuests = guestsList.filter(g => g.side === 'bride');
  const groomGuests = guestsList.filter(g => g.side === 'groom');

  const guestListData = [];

  // Add Bride's side
  if (brideGuests.length > 0) {
    guestListData.push(['=== BRIDE\'S SIDE ===', '', '', '', '']);
    brideGuests.forEach(guest => {
      const fullName = `${guest.first_name}${guest.last_name ? ' ' + guest.last_name : ''}`;
      guestListData.push([
        fullName,
        guest.first_name,
        guest.last_name || '',
        'Bride',
        guest.needs_accommodation ? 'Yes' : 'No'
      ]);
    });
    guestListData.push(['', '', '', '', '']); // Empty row
  }

  // Add Groom's side
  if (groomGuests.length > 0) {
    guestListData.push(['=== GROOM\'S SIDE ===', '', '', '', '']);
    groomGuests.forEach(guest => {
      const fullName = `${guest.first_name}${guest.last_name ? ' ' + guest.last_name : ''}`;
      guestListData.push([
        fullName,
        guest.first_name,
        guest.last_name || '',
        'Groom',
        guest.needs_accommodation ? 'Yes' : 'No'
      ]);
    });
  }

  // If no guests, show message
  if (guestListData.length === 0) {
    guestListData.push(['No guests found. Please import guests first on the Guests page.', '', '', '', '']);
  }

  const ws2 = XLSX.utils.aoa_to_sheet([
    guestListHeaders,
    ...guestListData
  ]);

  // Set column widths for guest list sheet
  ws2['!cols'] = [
    { wch: 30 }, // Full Name
    { wch: 20 }, // First Name
    { wch: 20 }, // Last Name
    { wch: 12 }, // Side
    { wch: 20 }  // Needs Accommodation
  ];

  // Create workbook with both sheets
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Room Allocations');
  XLSX.utils.book_append_sheet(wb, ws2, 'Guest List');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Generate Excel template for all venues room allocation import
 * Multi-venue template with separate sheets for each venue and guest list
 */
const generateAllVenuesAllocationTemplate = (venues = [], guestsList = []) => {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Room Number*',
    'Guest 1',
    'Guest 2',
    'Guest 3',
    'Check-in Date*',
    'Check-out Date*'
  ];

  // Sample data for venue sheets
  const sampleData = [
    ['101', 'John Doe', 'Jane Doe', '', '2024-12-15', '2024-12-17'],
    ['102', 'Raj Kumar', '', '', '2024-12-15', '2024-12-18'],
    ['103', 'Priya Sharma', 'Amit Sharma', '', '2024-12-14', '2024-12-19']
  ];

  const columnWidths = [
    { wch: 18 }, // Room Number
    { wch: 25 }, // Guest 1
    { wch: 25 }, // Guest 2
    { wch: 25 }, // Guest 3
    { wch: 18 }, // Check-in Date
    { wch: 18 }  // Check-out Date
  ];

  // Create a sheet for each venue
  if (venues.length > 0) {
    venues.forEach((venue, index) => {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
      ws['!cols'] = columnWidths;

      // Truncate sheet name if too long (Excel limit is 31 chars)
      let sheetName = `${index + 1}. ${venue.name}`;
      if (sheetName.length > 31) {
        sheetName = sheetName.substring(0, 28) + '...';
      }

      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
  } else {
    // If no venues, create a default sheet
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    ws['!cols'] = columnWidths;
    XLSX.utils.book_append_sheet(wb, ws, 'Room Allocations');
  }

  // ========== GUEST LIST SHEET (Reference) ==========
  const guestListHeaders = [
    'Full Name (Copy This)',
    'First Name',
    'Last Name',
    'Side',
    'Needs Accommodation'
  ];

  const brideGuests = guestsList.filter(g => g.side === 'bride');
  const groomGuests = guestsList.filter(g => g.side === 'groom');
  const guestListData = [];

  if (brideGuests.length > 0) {
    guestListData.push(['=== BRIDE\'S SIDE ===', '', '', '', '']);
    brideGuests.forEach(guest => {
      const fullName = `${guest.first_name}${guest.last_name ? ' ' + guest.last_name : ''}`;
      guestListData.push([
        fullName,
        guest.first_name,
        guest.last_name || '',
        'Bride',
        guest.needs_accommodation ? 'Yes' : 'No'
      ]);
    });
    guestListData.push(['', '', '', '', '']);
  }

  if (groomGuests.length > 0) {
    guestListData.push(['=== GROOM\'S SIDE ===', '', '', '', '']);
    groomGuests.forEach(guest => {
      const fullName = `${guest.first_name}${guest.last_name ? ' ' + guest.last_name : ''}`;
      guestListData.push([
        fullName,
        guest.first_name,
        guest.last_name || '',
        'Groom',
        guest.needs_accommodation ? 'Yes' : 'No'
      ]);
    });
  }

  if (guestListData.length === 0) {
    guestListData.push(['No guests found. Please import guests first on the Guests page.', '', '', '', '']);
  }

  const wsGuests = XLSX.utils.aoa_to_sheet([guestListHeaders, ...guestListData]);
  wsGuests['!cols'] = [
    { wch: 30 }, // Full Name
    { wch: 20 }, // First Name
    { wch: 20 }, // Last Name
    { wch: 12 }, // Side
    { wch: 20 }  // Needs Accommodation
  ];

  XLSX.utils.book_append_sheet(wb, wsGuests, 'Guest List');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Parse Excel file for guest import
 */
const parseGuestExcel = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON - First row (headers) is automatically used as keys, rows below are data
  const data = XLSX.utils.sheet_to_json(worksheet);

  // Filter out only completely empty rows
  const filteredData = data.filter(row => {
    const firstName = String(row['First Name*'] || row['First Name'] || row['first_name*'] || row['first_name'] || '').trim();
    const side = String(row['Side*'] || row['Side'] || row['side*'] || row['side'] || '').trim();

    // Only skip rows where both mandatory fields are empty
    return firstName !== '' || side !== '';
  });

  // Map Excel columns to database fields
  const guests = filteredData.map(row => {
    // Helper function to parse Yes/No values
    const parseYesNo = (value) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const normalized = value.toLowerCase().trim();
        return normalized === 'yes' || normalized === 'true' || normalized === '1';
      }
      return false;
    };

    // Helper to get string value and trim
    const getString = (value) => {
      return value ? String(value).trim() : '';
    };

    // Helper to normalize meal preference
    const normalizeMealPref = (value) => {
      if (!value) return 'vegetarian';
      const normalized = String(value).toLowerCase().trim();
      // Handle both formats: "Non Vegetarian" and "non_vegetarian"
      if (normalized.includes('non')) return 'non_vegetarian';
      if (normalized === 'jain') return 'jain';
      if (normalized === 'vegan') return 'vegan';
      return 'vegetarian';
    };

    const firstName = getString(row['First Name*'] || row['First Name'] || row['first_name*'] || row['first_name']);
    const side = getString(row['Side*'] || row['Side'] || row['side*'] || row['side']);
    const mealPref = getString(row['Meal Preference'] || row['meal_preference']);

    return {
      first_name: firstName,
      last_name: getString(row['Last Name'] || row['last_name']),
      phone: getString(row['Phone'] || row['phone']),
      email: getString(row['Email'] || row['email'] || ''),
      side: side ? side.toLowerCase() : '',
      relationship: getString(row['Relationship'] || row['relationship']),
      meal_preference: normalizeMealPref(mealPref),
      dietary_restrictions: getString(row['Dietary Restrictions'] || row['dietary_restrictions'] || ''),
      needs_accommodation: parseYesNo(row['Needs Accommodation'] || row['needs_accommodation']),
      needs_pickup: parseYesNo(row['Needs Pickup'] || row['needs_pickup']),
      is_vip: parseYesNo(row['Is VIP'] || row['is_vip'] || false),
      notes: getString(row['Notes'] || row['notes'] || '')
    };
  });

  return guests;
};

/**
 * Parse Excel file for room allocation import
 * New format: Room Number, Guest 1, Guest 2, Guest 3, Check-in Date, Check-out Date
 */
const parseRoomAllocationExcel = (buffer, hotelName) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON - First row (headers) is automatically used as keys, rows below are data
  const allData = XLSX.utils.sheet_to_json(worksheet);

  // Filter out only completely empty rows
  const data = allData.filter(row => {
    const roomNumber = String(row['Room Number*'] || row['Room Number'] || row['room_number*'] || row['room_number'] || '').trim();
    const guest1 = String(row['Guest 1'] || row['guest_1'] || '').trim();
    const checkIn = String(row['Check-in Date*'] || row['Check-in Date'] || row['check_in_date*'] || row['check_in_date'] || '').trim();

    // Only skip rows where all key fields are empty
    return roomNumber !== '' || guest1 !== '' || checkIn !== '';
  });

  // Helper to get string value and trim
  const getString = (value) => {
    return value ? String(value).trim() : '';
  };

  // Helper to split full name into first and last name
  const splitName = (fullName) => {
    if (!fullName || fullName.trim() === '') {
      return { first_name: '', last_name: '' };
    }
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return { first_name: parts[0], last_name: '' };
    }
    return {
      first_name: parts[0],
      last_name: parts.slice(1).join(' ')
    };
  };

  // Map Excel rows to allocation data
  // Each row can have multiple guests, so we need to create multiple allocation records
  const allocations = [];

  data.forEach(row => {
    const roomNumber = getString(row['Room Number*'] || row['Room Number'] || row['room_number*'] || row['room_number']);
    const checkInDate = getString(row['Check-in Date*'] || row['Check-in Date'] || row['check_in_date*'] || row['check_in_date']);
    const checkOutDate = getString(row['Check-out Date*'] || row['Check-out Date'] || row['check_out_date*'] || row['check_out_date']);

    // Process Guest 1, Guest 2, Guest 3
    const guests = [
      getString(row['Guest 1'] || row['guest_1']),
      getString(row['Guest 2'] || row['guest_2']),
      getString(row['Guest 3'] || row['guest_3'])
    ].filter(g => g !== ''); // Remove empty guests

    // Create an allocation for each guest
    guests.forEach(guestFullName => {
      const { first_name, last_name } = splitName(guestFullName);
      allocations.push({
        hotel_name: hotelName || '',
        room_number: roomNumber,
        guest_first_name: first_name,
        guest_last_name: last_name,
        guest_full_name: guestFullName, // Keep for reference
        check_in_date: checkInDate,
        check_out_date: checkOutDate
      });
    });
  });

  return allocations;
};

/**
 * Parse multi-venue Excel file for room allocation import
 * Parses all venue sheets (excluding the guest list reference sheet)
 */
const parseMultiVenueAllocationExcel = (buffer, venuesMap) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const allAllocations = [];

  // Helper to get string value and trim
  const getString = (value) => {
    return value ? String(value).trim() : '';
  };

  // Helper to split full name into first and last name
  const splitName = (fullName) => {
    if (!fullName || fullName.trim() === '') {
      return { first_name: '', last_name: '' };
    }
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return { first_name: parts[0], last_name: '' };
    }
    return {
      first_name: parts[0],
      last_name: parts.slice(1).join(' ')
    };
  };

  // Process each sheet except the guest list
  workbook.SheetNames.forEach(sheetName => {
    // Skip the guest list reference sheet
    if (sheetName.toLowerCase().includes('guest list') || sheetName.toLowerCase().includes('guest_list')) {
      return;
    }

    const worksheet = workbook.Sheets[sheetName];
    const allData = XLSX.utils.sheet_to_json(worksheet);

    // Filter out empty rows
    const data = allData.filter(row => {
      const roomNumber = getString(row['Room Number*'] || row['Room Number'] || row['room_number*'] || row['room_number'] || '');
      const guest1 = getString(row['Guest 1'] || row['guest_1'] || '');
      const checkIn = getString(row['Check-in Date*'] || row['Check-in Date'] || row['check_in_date*'] || row['check_in_date'] || '');
      return roomNumber !== '' || guest1 !== '' || checkIn !== '';
    });

    // Determine hotel name from sheet name
    // Sheet names are in format "1. Hotel Name" or just "Hotel Name"
    let hotelName = sheetName.replace(/^\d+\.\s*/, ''); // Remove leading number and dot

    // If we have a venues map, try to match the hotel name
    if (venuesMap) {
      const matchedVenue = Object.values(venuesMap).find(v =>
        hotelName.toLowerCase().includes(v.name.toLowerCase()) ||
        v.name.toLowerCase().includes(hotelName.toLowerCase())
      );
      if (matchedVenue) {
        hotelName = matchedVenue.name;
      }
    }

    // Process each row
    data.forEach(row => {
      const roomNumber = getString(row['Room Number*'] || row['Room Number'] || row['room_number*'] || row['room_number']);
      const checkInDate = getString(row['Check-in Date*'] || row['Check-in Date'] || row['check_in_date*'] || row['check_in_date']);
      const checkOutDate = getString(row['Check-out Date*'] || row['Check-out Date'] || row['check_out_date*'] || row['check_out_date']);

      // Process Guest 1, Guest 2, Guest 3
      const guests = [
        getString(row['Guest 1'] || row['guest_1']),
        getString(row['Guest 2'] || row['guest_2']),
        getString(row['Guest 3'] || row['guest_3'])
      ].filter(g => g !== '');

      // Create an allocation for each guest
      guests.forEach(guestFullName => {
        const { first_name, last_name } = splitName(guestFullName);
        allAllocations.push({
          hotel_name: hotelName,
          sheet_name: sheetName,
          room_number: roomNumber,
          guest_first_name: first_name,
          guest_last_name: last_name,
          guest_full_name: guestFullName,
          check_in_date: checkInDate,
          check_out_date: checkOutDate
        });
      });
    });
  });

  return allAllocations;
};

/**
 * Validate guest data
 */
const validateGuest = (guest) => {
  const errors = [];

  // Required field: First Name
  if (!guest.first_name || guest.first_name.trim() === '') {
    errors.push('First Name* is REQUIRED and cannot be empty');
  }

  // Required field: Side
  if (!guest.side || guest.side.trim() === '') {
    errors.push('Side* is REQUIRED and cannot be empty');
  } else if (!['bride', 'groom'].includes(guest.side.toLowerCase())) {
    errors.push('Side* must be exactly "Bride" or "Groom"');
  }

  // Optional field: Meal Preference (validate only if provided)
  const validMealPreferences = ['vegetarian', 'jain', 'vegan', 'non_vegetarian'];
  if (guest.meal_preference && guest.meal_preference.trim() !== '') {
    if (!validMealPreferences.includes(guest.meal_preference.toLowerCase())) {
      errors.push(`Meal Preference must be one of: Vegetarian, Jain, Vegan, Non Vegetarian`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate room allocation data
 */
const validateRoomAllocation = (allocation) => {
  const errors = [];

  // Required: Room Number
  if (!allocation.room_number || allocation.room_number.trim() === '') {
    errors.push('Room Number* is REQUIRED and cannot be empty');
  }

  // Required: At least one guest
  if (!allocation.guest_first_name || allocation.guest_first_name.trim() === '') {
    errors.push('At least one guest is REQUIRED for room allocation');
  }

  // Required: Check-in Date
  if (!allocation.check_in_date || allocation.check_in_date.trim() === '') {
    errors.push('Check-in Date* is REQUIRED and cannot be empty');
  }

  // Required: Check-out Date
  if (!allocation.check_out_date || allocation.check_out_date.trim() === '') {
    errors.push('Check-out Date* is REQUIRED and cannot be empty');
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (allocation.check_in_date && allocation.check_in_date.trim() !== '' && !dateRegex.test(allocation.check_in_date.trim())) {
    errors.push('Check-in Date* must be in YYYY-MM-DD format (e.g., 2024-12-15)');
  }

  if (allocation.check_out_date && allocation.check_out_date.trim() !== '' && !dateRegex.test(allocation.check_out_date.trim())) {
    errors.push('Check-out Date* must be in YYYY-MM-DD format (e.g., 2024-12-17)');
  }

  // Validate check-out date is after check-in date
  if (allocation.check_in_date && allocation.check_out_date) {
    const checkIn = new Date(allocation.check_in_date);
    const checkOut = new Date(allocation.check_out_date);
    if (checkOut <= checkIn) {
      errors.push('Check-out Date* must be after Check-in Date*');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  generateGuestTemplate,
  generateRoomAllocationTemplate,
  generateAllVenuesAllocationTemplate,
  parseGuestExcel,
  parseRoomAllocationExcel,
  parseMultiVenueAllocationExcel,
  validateGuest,
  validateRoomAllocation,
  findSimilarGuests
};
