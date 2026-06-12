import { Router } from 'express';
import { SensorController } from '../controllers/sensor.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { warehouseScopeMiddleware } from '../middleware/rbac.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/live', warehouseScopeMiddleware, SensorController.getLive);
router.get('/history', SensorController.getHistory);
router.get('/heatmap', warehouseScopeMiddleware, SensorController.getHeatmap);
router.get('/analytics', warehouseScopeMiddleware, SensorController.getAnalytics);
router.get('/export', warehouseScopeMiddleware, SensorController.exportCsv);
router.get('/anomalies', warehouseScopeMiddleware, SensorController.getAnomalies);

export default router;
