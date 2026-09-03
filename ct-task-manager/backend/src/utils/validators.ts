/**
 * Validation utilities for verified user data.
 */

export const isValidUniversityId = (id: string): boolean => {
  return /^\d{5}$/.test(id);
};

export const isValidPhone = (phone: string): boolean => {
  return /^\d{10}$/.test(phone);
};

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

/**
 * Normalize a raw string value — trim whitespace and convert to string.
 */
export const normalizeString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

/**
 * Normalize a phone number — strip spaces, dashes, and leading +91.
 */
export const normalizePhone = (value: unknown): string => {
  const raw = normalizeString(value);
  // Remove common formatting characters
  const cleaned = raw.replace(/[\s\-().+]/g, '');
  // Strip leading 91 if the result is 12 digits (country code)
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned.slice(2);
  }
  return cleaned;
};

/**
 * Normalize university ID — pad with leading zeros if numeric and < 5 chars.
 */
export const normalizeUniversityId = (value: unknown): string => {
  const raw = normalizeString(value);
  // If it's purely numeric, pad to 5 digits
  if (/^\d+$/.test(raw) && raw.length < 5) {
    return raw.padStart(5, '0');
  }
  return raw;
};

/**
 * Required column mappings from Excel/CSV headers → internal field names.
 */
export const COLUMN_MAP: Record<string, string> = {
  'id': 'universityId',
  'university id': 'universityId',
  'universityid': 'universityId',
  'name': 'name',
  'email': 'email',
  'e-mail': 'email',
  'email id': 'email',
  'phone': 'phone',
  'phone no': 'phone',
  'phone no.': 'phone',
  'phone number': 'phone',
  'phoneno': 'phone',
  'mobile': 'phone',
  'mobile no': 'phone',
  'mobile no.': 'phone',
  'department': 'department',
  'dept': 'department',
  'dept.': 'department',
  'type': 'userType',
  'user type': 'userType',
  'usertype': 'userType',
  'role': 'userType',
  'category': 'userType',
};

export const REQUIRED_FIELDS = ['universityId', 'name', 'email', 'phone'];

export interface RowValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ParsedVerifiedUser {
  universityId: string;
  name: string;
  email: string;
  phone: string;
  department: string | null;
  userType: 'staff' | 'student';
}

export interface ImportResult {
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: RowValidationError[];
}

/**
 * Validate a single parsed row and return errors if any.
 */
export const validateRow = (
  row: Record<string, string>,
  rowNumber: number
): RowValidationError[] => {
  const errors: RowValidationError[] = [];

  if (!isNonEmptyString(row.universityId)) {
    errors.push({ row: rowNumber, field: 'ID', message: 'University ID is required' });
  } else if (!isValidUniversityId(row.universityId)) {
    errors.push({
      row: rowNumber,
      field: 'ID',
      message: `Invalid University ID "${row.universityId}". Expected exactly 5 digits`,
    });
  }

  if (!isNonEmptyString(row.name)) {
    errors.push({ row: rowNumber, field: 'Name', message: 'Name is required' });
  }

  if (!isNonEmptyString(row.email)) {
    errors.push({ row: rowNumber, field: 'Email', message: 'Email is required' });
  } else if (!isValidEmail(row.email)) {
    errors.push({
      row: rowNumber,
      field: 'Email',
      message: `Invalid email format "${row.email}"`,
    });
  }

  if (!isNonEmptyString(row.phone)) {
    errors.push({ row: rowNumber, field: 'Phone', message: 'Phone number is required' });
  } else if (!isValidPhone(row.phone)) {
    errors.push({
      row: rowNumber,
      field: 'Phone',
      message: `Invalid phone number "${row.phone}". Expected exactly 10 digits`,
    });
  }

  return errors;
};
