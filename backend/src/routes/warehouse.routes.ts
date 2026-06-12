import { Router } from 'express';
import { WarehouseController } from '../controllers/warehouse.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { rbacMiddleware, warehouseScopeMiddleware } from '../middleware/rbac.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', WarehouseController.list);
router.post('/', rbacMiddleware(['superadmin']), WarehouseController.create);
router.get('/:id', warehouseScopeMiddleware, WarehouseController.getById);
router.put('/:id', rbacMiddleware(['superadmin', 'warehouse_manager']), warehouseScopeMiddleware, WarehouseController.update);
router.get('/:id/stats', warehouseScopeMiddleware, WarehouseController.getStats);
router.get('/:id/zones', warehouseScopeMiddleware, WarehouseController.getZones);

export default router;
