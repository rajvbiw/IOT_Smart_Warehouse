import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { warehouseScopeMiddleware } from '../middleware/rbac.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/overview', warehouseScopeMiddleware, DashboardController.getOverview);
router.get('/timeline', warehouseScopeMiddleware, DashboardController.getTimeline);
router.get('/zones', warehouseScopeMiddleware, DashboardController.getZones);

export default router;
