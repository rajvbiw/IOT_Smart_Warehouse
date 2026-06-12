import { Router } from 'express';
import authRoutes from './auth.routes';
import warehouseRoutes from './warehouse.routes';
import deviceRoutes from './device.routes';
import sensorRoutes from './sensor.routes';
import alertRoutes from './alert.routes';
import assetRoutes from './asset.routes';
import reportRoutes from './report.routes';
import dashboardRoutes from './dashboard.routes';
import uploadRoutes from './upload.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/warehouses', warehouseRoutes);
router.use('/devices', deviceRoutes);
router.use('/sensors', sensorRoutes);
router.use('/alerts', alertRoutes); // also handles rules under rules/
router.use('/assets', assetRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/upload', uploadRoutes);

export default router;
