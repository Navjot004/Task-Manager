import { Router, Request, Response } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { authenticate, authorizeRoles } from '../middleware/auth';

const router = Router();

// @route   POST /api/auth/register
// @desc    Register a new user (verifies against verified_users)
// @access  Public
router.post('/register', register);

// @route   POST /api/auth/login
// @desc    Authenticate user and get token
// @access  Public
router.post('/login', login);

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', authenticate, getMe);

// @route   GET /api/auth/protected-test
// @desc    Test protected route
// @access  Private
router.get('/protected-test', authenticate, (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'You are authenticated',
    user: req.user,
  });
});

// @route   GET /api/auth/super-admin-test
// @desc    Test super_admin role authorization
// @access  Private (Super Admin)
router.get(
  '/super-admin-test',
  authenticate,
  authorizeRoles('super_admin'),
  (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'You are a Super Admin',
    });
  }
);

export default router;
