import { Router } from 'express';
import { uploadFile } from '../middleware/upload';
import {
  importFile,
  getVerifiedUsers,
  getStats,
  getByUniversityId,
  downloadTemplate,
} from '../controllers/verifiedUserController';

const router = Router();

// POST /api/verified-users/import — Upload Excel/CSV file
router.post('/import', uploadFile.single('file'), importFile);

// GET /api/verified-users/template — Download blank template
router.get('/template', downloadTemplate);

// GET /api/verified-users/stats — Summary statistics
router.get('/stats', getStats);

// GET /api/verified-users/:universityId — Single user lookup
router.get('/:universityId', getByUniversityId);

// GET /api/verified-users — List with pagination, search, filter
router.get('/', getVerifiedUsers);

export default router;
