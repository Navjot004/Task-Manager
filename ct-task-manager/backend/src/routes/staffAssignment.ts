import { Router } from 'express';
import {
  getAssignments,
  createAssignment,
  updateAssignmentStatus,
  getAdminAssignments,
  getStaffAssignment,
} from '../controllers/staffAssignmentController';
import { authenticate, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// @route   GET /api/staff-assignments
// @desc    Get all staff assignments
// @access  Super Admin
router.get('/', authorizeRoles('super_admin'), getAssignments);

// @route   POST /api/staff-assignments
// @desc    Create/reassign a staff assignment
// @access  Super Admin, Department Admin
router.post('/', authorizeRoles('super_admin', 'department_admin'), createAssignment);

// @route   PATCH /api/staff-assignments/:id
// @desc    Deactivate an assignment (remove staff)
// @access  Super Admin, Department Admin (own only)
router.patch('/:id', authorizeRoles('super_admin', 'department_admin'), updateAssignmentStatus);

// @route   GET /api/staff-assignments/admin/:adminId
// @desc    Get active staff assignments for a specific admin
// @access  Super Admin, Department Admin (own only)
router.get('/admin/:adminId', authorizeRoles('super_admin', 'department_admin'), getAdminAssignments);

// @route   GET /api/staff-assignments/staff/:staffId
// @desc    Get active admin assignment for a specific staff member
// @access  Super Admin, Staff (own only)
router.get('/staff/:staffId', authorizeRoles('super_admin', 'staff'), getStaffAssignment);

export default router;
