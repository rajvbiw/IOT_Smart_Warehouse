import { Router } from 'express';
import { AlertController } from '../controllers/alert.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { rbacMiddleware, warehouseScopeMiddleware } from '../middleware/rbac.middleware';

const router = Router();

router.use(authMiddleware);

// Alerts endpoints
router.get('/', AlertController.list);
router.post('/bulk-acknowledge', rbacMiddleware(['superadmin', 'warehouse_manager', 'operator']), AlertController.bulkAcknowledge);
router.get('/:id', AlertController.getById);
router.put('/:id/acknowledge', rbacMiddleware(['superadmin', 'warehouse_manager', 'operator']), AlertController.acknowledge);
router.put('/:id/resolve', rbacMiddleware(['superadmin', 'warehouse_manager', 'operator']), AlertController.resolve);

// Alert Rules endpoints (grouped as /api/alert-rules in main, but mapped here as rule routes)
// Note: We can mount them under different paths in the main router.
router.get('/rules/all', AlertController.listRules);
router.post('/rules/create', rbacMiddleware(['superadmin', 'warehouse_manager']), AlertController.createRule);
router.put('/rules/:id', rbacMiddleware(['superadmin', 'warehouse_manager']), AlertController.updateRule);
router.delete('/rules/:id', rbacMiddleware(['superadmin', 'warehouse_manager']), AlertController.deleteRule);

export default router;
