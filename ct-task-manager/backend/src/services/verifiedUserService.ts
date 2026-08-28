import * as XLSX from 'xlsx';
import {
  COLUMN_MAP,
  REQUIRED_FIELDS,
  normalizeString,
  normalizePhone,
  normalizeUniversityId,
  validateRow,
  ParsedVerifiedUser,
  RowValidationError,
  ImportResult,
} from '../utils/validators';
import VerifiedUser from '../models/VerifiedUser';

/**
 * Parse an uploaded file buffer into raw row objects.
 * Supports .xlsx and .csv formats.
 */
export const parseFile = (
  buffer: Buffer,
  originalName: string
): Record<string, unknown>[] => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('The uploaded file contains no sheets');
  }
  const sheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: '',
  });

  if (rawRows.length === 0) {
    throw new Error(`The uploaded file "${originalName}" contains no data rows`);
  }

  return rawRows;
};

/**
 * Map raw Excel/CSV headers to normalized internal field names.
 */
const mapHeaders = (
  rawRow: Record<string, unknown>
): Record<string, string> => {
  const mapped: Record<string, string> = {};

  for (const [rawKey, rawValue] of Object.entries(rawRow)) {
    const normalizedKey = rawKey.toLowerCase().trim().replace(/\s+/g, ' ');

    // Skip "sr. no." and "sr no" — they're not needed
    if (
      normalizedKey === 'sr. no.' ||
      normalizedKey === 'sr no' ||
      normalizedKey === 'sr. no' ||
      normalizedKey === 'sno' ||
      normalizedKey === 's. no.' ||
      normalizedKey === 's.no.' ||
      normalizedKey === 's no' ||
      normalizedKey === 'serial no' ||
      normalizedKey === 'serial no.' ||
      normalizedKey === '#'
    ) {
      continue;
    }

    const fieldName = COLUMN_MAP[normalizedKey];
    if (fieldName) {
      mapped[fieldName] = normalizeString(rawValue);
    }
  }

  return mapped;
};

/**
 * Validate that the file contains all required column headers.
 */
const validateHeaders = (rawRow: Record<string, unknown>): string[] => {
  const mapped = mapHeaders(rawRow);
  const missing: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (!(field in mapped)) {
      missing.push(field);
    }
  }

  return missing;
};

/**
 * Process the parsed rows: validate, normalize, and import into MongoDB.
 */
export const importVerifiedUsers = async (
  buffer: Buffer,
  originalName: string
): Promise<ImportResult> => {
  const rawRows = parseFile(buffer, originalName);

  // Validate required headers from the first row
  const missingHeaders = validateHeaders(rawRows[0]);
  if (missingHeaders.length > 0) {
    throw new Error(
      `Missing required columns: ${missingHeaders.join(', ')}. ` +
      `Required columns are: ID, Name, Email, Phone No.`
    );
  }

  const result: ImportResult = {
    totalRows: rawRows.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  // Phase 1: Parse, normalize, and validate all rows
  const parsedRows: { rowNumber: number; data: ParsedVerifiedUser }[] = [];
  const seenIds = new Map<string, number>(); // universityId → first row number

  for (let i = 0; i < rawRows.length; i++) {
    const rowNumber = i + 2; // 1-indexed + header row
    const mapped = mapHeaders(rawRows[i]);

    // Normalize specific fields
    mapped.universityId = normalizeUniversityId(mapped.universityId);
    mapped.phone = normalizePhone(mapped.phone);
    mapped.email = (mapped.email || '').toLowerCase().trim();

    // Validate row
    const rowErrors = validateRow(mapped, rowNumber);
    if (rowErrors.length > 0) {
      result.errors.push(...rowErrors);
      result.skipped++;
      continue;
    }

    // Check for duplicate University IDs within the file
    if (seenIds.has(mapped.universityId)) {
      result.errors.push({
        row: rowNumber,
        field: 'ID',
        message: `Duplicate University ID "${mapped.universityId}" — first seen in row ${seenIds.get(mapped.universityId)}`,
      });
      result.skipped++;
      continue;
    }
    seenIds.set(mapped.universityId, rowNumber);

    parsedRows.push({
      rowNumber,
      data: {
        universityId: mapped.universityId,
        name: mapped.name,
        email: mapped.email,
        phone: mapped.phone,
        department: mapped.department || null,
      },
    });
  }

  // Phase 2: Upsert valid rows into MongoDB
  for (const { data } of parsedRows) {
    try {
      const existing = await VerifiedUser.findOne({
        universityId: data.universityId,
      });

      if (existing) {
        // Update existing — preserve isRegistered and registeredUserId
        existing.name = data.name;
        existing.email = data.email;
        existing.phone = data.phone;
        existing.department = data.department;
        await existing.save();
        result.updated++;
      } else {
        // Insert new
        await VerifiedUser.create(data);
        result.inserted++;
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown database error';
      result.errors.push({
        row: 0,
        field: 'database',
        message: `Failed to save University ID "${data.universityId}": ${message}`,
      });
      result.skipped++;
    }
  }

  return result;
};
