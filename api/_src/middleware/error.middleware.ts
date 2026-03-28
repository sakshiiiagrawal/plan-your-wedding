import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/AppError';

interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

function isSupabaseError(err: unknown): err is SupabaseError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    ('code' in err || 'details' in err || 'hint' in err)
  );
}

function getUserFriendlyMessage(err: SupabaseError): string | null {
  const message = err.message ?? '';
  const code = err.code ?? '';

  // Column not found errors
  if (message.includes('Could not find') && message.includes('column')) {
    const columnMatch = message.match(/'([^']+)'/);
    const column = columnMatch?.[1] ?? 'field';
    return `Invalid field "${column}" provided. Please check your data and try again.`;
  }

  // Enum / invalid value errors
  if (
    code === '22P02' ||
    message.includes('invalid input value for enum') ||
    message.includes('invalid input syntax for enum')
  ) {
    if (message.includes('room_type')) {
      return 'Invalid room type provided.';
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
    const enumMatch = message.match(/enum (\w+)/);
    if (enumMatch?.[1]) {
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
  if (
    code === '23505' ||
    message.includes('unique constraint') ||
    message.includes('duplicate key')
  ) {
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
    const column = columnMatch?.[1] ?? 'field';
    const friendlyName = column.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
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

  return null;
}

export default function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  // next must be present for Express to recognise this as a 4-argument error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  console.error('=== Error Details ===');
  if (err instanceof Error) {
    console.error('Message:', err.message);
    console.error('Name:', err.name);
    console.error('Stack:', err.stack);
  } else {
    console.error('Unknown error:', err);
  }
  console.error('===================');

  // AppError (our own structured errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // JWT errors
  if (err instanceof Error && err.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid authentication token. Please log in again.',
    });
    return;
  }

  if (err instanceof Error && err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'Session Expired',
      message: 'Your session has expired. Please log in again.',
    });
    return;
  }

  // Supabase / database errors
  if (isSupabaseError(err)) {
    const friendlyMessage = getUserFriendlyMessage(err);

    if (friendlyMessage) {
      res.status(400).json({
        error: 'Validation Error',
        message: friendlyMessage,
      });
      return;
    }

    console.error('Unhandled database error - returning original message for debugging');
    res.status(400).json({
      error: 'Database Error',
      message:
        err.message ||
        'An error occurred while processing your request. Please check your input and try again.',
    });
    return;
  }

  // Default 500
  const status =
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as Record<string, unknown>).status === 'number'
      ? (err as { status: number }).status
      : 500;

  const message =
    err instanceof Error ? err.message : 'An unexpected error occurred. Please try again later.';

  res.status(status).json({
    error: message,
    message: 'An unexpected error occurred. Please try again later.',
  });
}
