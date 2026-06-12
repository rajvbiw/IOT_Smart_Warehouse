import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Note: Local download endpoint does NOT require auth to easily link from emails/browser clicks
router.get('/local-download/:key', UploadController.downloadLocal);

router.use(authMiddleware);

router.post('/report', UploadController.uploadReport);
router.get('/signed-url', UploadController.getSignedUrl);

export default router;
