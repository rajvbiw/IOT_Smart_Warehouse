import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { rbacMiddleware, warehouseScopeMiddleware } from '../middleware/rbac.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', warehouseScopeMiddleware, ReportController.list);
router.post('/generate', rbacMiddleware(['superadmin', 'warehouse_manager']), ReportController.generate);
router.get('/:id/download', ReportController.download);
router.get('/daily', warehouseScopeMiddleware, ReportController.getDaily);
router.get('/monthly', warehouseScopeMiddleware, ReportController.getMonthly);

export default router;
