import { Router } from 'express';
import healthRoutes from './health';
import authRoutes from './auth';
import verifiedUserRoutes from './verifiedUsers';
import userRoutes from './user';
import staffAssignmentRoutes from './staffAssignment';
import taskRoutes from './task';
import departmentRoutes from './department';

const router = Router();

// Mount routes
router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/verified-users', verifiedUserRoutes);
router.use('/users', userRoutes);
router.use('/staff-assignments', staffAssignmentRoutes);
router.use('/tasks', taskRoutes);
router.use('/departments', departmentRoutes);

export default router;
