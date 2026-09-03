import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingController';
import { authenticate, authorizeRoles } from '../middleware/auth';

const router = express.Router();

// Public: All authenticated and guest users can fetch branding/system settings
router.get('/', getSettings);

// Super Admin only: Update settings
router.patch('/', authenticate, authorizeRoles('super_admin'), updateSettings);

export default router;
