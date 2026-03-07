/**
 * Converts technical database error messages into user-friendly messages
 */
const getUserFriendlyMessage = (err) => {
  const message = err.message || '';
  const code = err.code || '';
  const details = err.details || '';
  const hint = err.hint || '';

  // Column not found errors
  if (message.includes('Could not find') && message.includes('column')) {
    const columnMatch = message.match(/'([^']+)'/);
    const column = columnMatch ? columnMatch[1] : 'field';
    return `Invalid field "${column}" provided. Please check your data and try again.`;
  }

  // Enum/Invalid value errors
  if (code === '22P02' || message.includes('invalid input value for enum') || message.includes('invalid input syntax for enum')) {
    if (message.includes('room_type')) {
      return 'Invalid room type. Please select one of: Single, Double, Suite, Family, or Dormitory.';
    }
    if (message.includes('guest_side')) {
      return 'Invalid side. Please select either Bride, Groom, or Mutual.';
    }
    if (message.includes('rsvp_status')) {
      return 'Invalid RSVP status. Please select: Pending, Confirmed, Declined, or Tentative.';
    }
    if (message.includes('meal_preference')) {
      return 'Invalid meal preference. Please select: Vegetarian, Jain, Vegan, or Non-Vegetarian.';
    }
    if (message.includes('payment_status')) {
      return 'Invalid payment status. Please select: Pending, Partial, Paid, Overdue, or Cancelled.';
    }
    if (message.includes('payment_method')) {
      return 'Invalid payment method. Please select: Cash, Bank Transfer, UPI, Cheque, or Credit Card.';
    }
    if (message.includes('task_priority')) {
      return 'Invalid task priority. Please select: Low, Medium, High, or Urgent.';
    }
    if (message.includes('task_status')) {
      return 'Invalid task status. Please select: Pending, In Progress, Completed, or Cancelled.';
    }
    if (message.includes('vendor_category')) {
      return 'Invalid vendor category. Please select a valid category from the list.';
    }
    // Extract enum name and valid values if possible
    const enumMatch = message.match(/enum (\w+)/);
    if (enumMatch) {
      return `Invalid value provided for ${enumMatch[1]}. Please select a valid option.`;
    }
    return 'Invalid value provided. Please select from the available options.';
  }

  // Foreign key violations
  if (code === '23503' || message.includes('foreign key constraint')) {
    if (message.includes('vendor_id')) {
      return 'The selected vendor does not exist. Please select a valid vendor.';
    }
    if (message.includes('event_id')) {
      return 'The selected event does not exist. Please select a valid event.';
    }
    if (message.includes('guest_id')) {
      return 'The selected guest does not exist. Please select a valid guest.';
    }
    if (message.includes('room_id')) {
      return 'The selected room does not exist. Please select a valid room.';
    }
    if (message.includes('accommodation_id')) {
      return 'The selected accommodation does not exist. Please select a valid accommodation.';
    }
    if (message.includes('venue_id')) {
      return 'The selected venue does not exist. Please select a valid venue.';
    }
    if (message.includes('category_id')) {
      return 'The selected category does not exist. Please select a valid category.';
    }
    return 'The selected item does not exist or has been deleted. Please refresh and try again.';
  }

  // Unique constraint violations
  if (code === '23505' || message.includes('unique constraint') || message.includes('duplicate key')) {
    if (message.includes('email')) {
      return 'This email address is already registered. Please use a different email.';
    }
    if (message.includes('phone')) {
      return 'This phone number is already registered. Please use a different phone number.';
    }
    if (message.includes('room_number')) {
      return 'This room number already exists. Please use a different room number.';
    }
    return 'This entry already exists. Please check for duplicates and try again.';
  }

  // NOT NULL violations
  if (code === '23502' || message.includes('null value in column')) {
    const columnMatch = message.match(/column "([^"]+)"/);
    const column = columnMatch ? columnMatch[1] : 'field';
    const friendlyName = column
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
    return `${friendlyName} is required. Please provide a value.`;
  }

  // Check constraint violations
  if (code === '23514' || message.includes('check constraint')) {
    return 'The provided value does not meet the required format or constraints. Please check your input.';
  }

  // Data type errors
  if (message.includes('invalid input syntax')) {
    if (message.includes('uuid')) {
      return 'Invalid ID format. Please try again or refresh the page.';
    }
    if (message.includes('integer')) {
      return 'Please enter a valid number.';
    }
    if (message.includes('date')) {
      return 'Please enter a valid date.';
    }
    if (message.includes('time')) {
      return 'Please enter a valid time.';
    }
    if (message.includes('boolean')) {
      return 'Invalid true/false value. Please try again.';
    }
    return 'Invalid data format. Please check your input and try again.';
  }

  // Permission errors
  if (code === '42501' || message.includes('permission denied')) {
    return 'You do not have permission to perform this action.';
  }

  // Row not found
  if (message.includes('No rows found') || message.includes('not found')) {
    return 'The requested item was not found. It may have been deleted.';
  }

  // Connection errors
  if (message.includes('connection') || message.includes('timeout')) {
    return 'Unable to connect to the database. Please check your connection and try again.';
  }

  // Return original message if no pattern matches
  return null;
};

const errorMiddleware = (err) => {
  // Log detailed error information for debugging
  console.error('=== Error Details ===');
  console.error('Message:', err.message);
  console.error('Code:', err.code);
  console.error('Details:', err.details);
  console.error('Hint:', err.hint);
  console.error('Full Error:', err);
  console.error('===================');

  // Joi validation errors
  if (err.isJoi) {
    return {
      status: 400,
      body: {
        error: 'Validation Error',
        message: 'Please check the form and fill in all required fields.',
        details: err.details.map(d => d.message)
      }
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return {
      status: 401,
      body: {
        error: 'Authentication Error',
        message: 'Invalid authentication token. Please log in again.'
      }
    };
  }

  if (err.name === 'TokenExpiredError') {
    return {
      status: 401,
      body: {
        error: 'Session Expired',
        message: 'Your session has expired. Please log in again.'
      }
    };
  }

  // Supabase/Database errors
  if (err.code || err.message) {
    const friendlyMessage = getUserFriendlyMessage(err);

    if (friendlyMessage) {
      return {
        status: 400,
        body: {
          error: 'Validation Error',
          message: friendlyMessage
        }
      };
    }

    // If no friendly message found, log and return the actual error for debugging
    console.error('Unhandled database error - returning original message for debugging');
    return {
      status: 400,
      body: {
        error: 'Database Error',
        message: err.message || 'An error occurred while processing your request. Please check your input and try again.'
      }
    };
  }

  // Default error
  return {
    status: err.status || 500,
    body: {
      error: err.message || 'Internal Server Error',
      message: 'An unexpected error occurred. Please try again later.'
    }
  };
};

// Wrapper to maintain Express middleware signature
module.exports = (err, req, res, next) => {
  const { status, body } = errorMiddleware(err);
  res.status(status).json(body);
};

module.exports = errorMiddleware;
