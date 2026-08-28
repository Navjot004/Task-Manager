import { Request, Response } from 'express';
import VerifiedUser from '../models/VerifiedUser';
import { importVerifiedUsers } from '../services/verifiedUserService';

/**
 * POST /api/verified-users/import
 * Upload and import an Excel (.xlsx) or CSV file of verified users.
 */
export const importFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload a .xlsx or .csv file.',
      });
      return;
    }

    const result = await importVerifiedUsers(req.file.buffer, req.file.originalname);

    res.status(200).json({
      success: true,
      message: 'Import completed',
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed';
    res.status(400).json({
      success: false,
      message,
    });
  }
};

/**
 * GET /api/verified-users
 * List verified users with pagination, search, and filter.
 *
 * Query params:
 *   page     - page number (default: 1)
 *   limit    - items per page (default: 20)
 *   search   - search by name, email, universityId
 *   status   - filter by registration: "registered" | "not-registered"
 */
export const getVerifiedUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = (req.query.search as string || '').trim();
    const status = (req.query.status as string || '').trim().toLowerCase();

    // Build filter
    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { universityId: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    if (status === 'registered') {
      filter.isRegistered = true;
    } else if (status === 'not-registered') {
      filter.isRegistered = false;
    }

    const total = await VerifiedUser.countDocuments(filter);
    const users = await VerifiedUser.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-__v');

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch verified users';
    res.status(500).json({ success: false, message });
  }
};

/**
 * GET /api/verified-users/stats
 * Return summary statistics.
 */
export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const total = await VerifiedUser.countDocuments();
    const registered = await VerifiedUser.countDocuments({ isRegistered: true });
    const notRegistered = await VerifiedUser.countDocuments({ isRegistered: false });

    // Get distinct departments
    const departments = await VerifiedUser.distinct('department', {
      department: { $nin: [null, ''] },
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        registered,
        notRegistered,
        departments: departments.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stats';
    res.status(500).json({ success: false, message });
  }
};

/**
 * GET /api/verified-users/:universityId
 * Get a single verified user by University ID.
 */
export const getByUniversityId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { universityId } = req.params;

    const user = await VerifiedUser.findOne({ universityId }).select('-__v');
    if (!user) {
      res.status(404).json({
        success: false,
        message: `Verified user with ID "${universityId}" not found`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch user';
    res.status(500).json({ success: false, message });
  }
};

/**
 * GET /api/verified-users/template
 * Download a blank template file (.xlsx).
 */
export const downloadTemplate = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Dynamic import for xlsx to generate the template
    const XLSX = await import('xlsx');

    const templateData = [
      {
        'Sr. No.': 1,
        'ID': '10001',
        'Name': 'Example Name',
        'Email': 'example@ctuniversity.in',
        'Phone No.': '9876500001',
        'Department': 'Computer Science',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Set column widths for readability
    worksheet['!cols'] = [
      { wch: 8 },   // Sr. No.
      { wch: 10 },  // ID
      { wch: 25 },  // Name
      { wch: 35 },  // Email
      { wch: 15 },  // Phone No.
      { wch: 25 },  // Department
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Verified Users');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=verified_users_template.xlsx');
    res.send(buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate template';
    res.status(500).json({ success: false, message });
  }
};
