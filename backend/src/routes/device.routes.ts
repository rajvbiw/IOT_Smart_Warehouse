import { Router } from 'express';
import { DeviceController } from '../controllers/device.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { rbacMiddleware, warehouseScopeMiddleware } from '../middleware/rbac.middleware';

const router = Router();

router.use(authMiddleware);

// Get offline devices must be matched BEFORE /:id else it will hit the parameter route
router.get('/offline', DeviceController.getOffline);

router.get('/', DeviceController.list);
router.post('/', rbacMiddleware(['superadmin', 'warehouse_manager']), DeviceController.create);
router.get('/:id', DeviceController.getById);
router.put('/:id', rbacMiddleware(['superadmin', 'warehouse_manager']), DeviceController.update);
router.delete('/:id', rbacMiddleware(['superadmin']), DeviceController.delete);

// Live, Influx, and Maintenance routes
router.get('/:id/latest', DeviceController.getLatest);
router.get('/:id/readings', DeviceController.getReadings);
router.post('/:id/maintenance', rbacMiddleware(['superadmin', 'warehouse_manager', 'operator']), DeviceController.logMaintenance);

export default router;
