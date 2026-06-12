import { Router } from 'express';
import { AssetController } from '../controllers/asset.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { rbacMiddleware, warehouseScopeMiddleware } from '../middleware/rbac.middleware';

const router = Router();

router.use(authMiddleware);

// Singular/Helper routes first
router.get('/low-stock', AssetController.getLowStock);
router.get('/movements', AssetController.getMovements);
router.get('/valuation', AssetController.getValuation);

router.get('/', AssetController.list);
router.post('/', rbacMiddleware(['superadmin', 'warehouse_manager']), AssetController.create);
router.get('/:id', AssetController.getById);
router.put('/:id', rbacMiddleware(['superadmin', 'warehouse_manager']), AssetController.update);
router.post('/:id/movement', rbacMiddleware(['superadmin', 'warehouse_manager', 'operator']), AssetController.recordMovement);

export default router;
