import { Router, Request, Response } from 'express';
import { getDatabaseStatus } from '../config/database';

const router = Router();

// GET /api/health
router.get('/health', (_req: Request, res: Response) => {
  const dbStatus = getDatabaseStatus();

  res.status(200).json({
    success: true,
    message: 'Backend is running',
    database: dbStatus,
  });
});

export default router;
