import express from 'express';
import { getDepartments, createDepartment, deleteDepartment } from '../controllers/departmentController';
import { authenticate, authorizeRoles } from '../middleware/auth';

const router = express.Router();

// Publicly accessible so the registration form can fetch the dropdown list
router.get('/', getDepartments);

// Only Super Admins can manage departments
router.post('/', authenticate, authorizeRoles('super_admin'), createDepartment);
router.delete('/:id', authenticate, authorizeRoles('super_admin'), deleteDepartment);

export default router;
