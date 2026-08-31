import { Router } from 'express';
import { getFile, getFileMetadata } from '../controllers/fileController';

const router = Router();

// Assuming files are accessible without auth or we add auth later
router.get('/:id', getFile);
router.get('/:id/metadata', getFileMetadata);

export default router;
