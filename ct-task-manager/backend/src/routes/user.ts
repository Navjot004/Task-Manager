import { Router } from 'express';
import {
  getUsers,
  getUserStats,
  getUserById,
  updateUserRole,
  updateUserStatus,
} from '../controllers/userController';
import { authenticate, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// @route   GET /api/users
// @desc    Get all registered users with pagination & filtering
router.get('/', authorizeRoles('super_admin', 'department_admin'), getUsers);

// The remaining routes require Super Admin access
router.use(authorizeRoles('super_admin'));

// @route   GET /api/users/stats
// @desc    Get user counts by role and status
router.get('/stats', getUserStats);

// @route   GET /api/users/:id
// @desc    Get single user details
router.get('/:id', getUserById);

// @route   PATCH /api/users/:id/role
// @desc    Update user's role
router.patch('/:id/role', updateUserRole);

// @route   PATCH /api/users/:id/status
// @desc    Activate/deactivate user
router.patch('/:id/status', updateUserStatus);

export default router;
