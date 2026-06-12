import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';

/**
 * RBAC Middleware: Checks if user role is in the list of allowed roles.
 */
export function rbacMiddleware(allowedRoles: ('superadmin' | 'warehouse_manager' | 'operator' | 'viewer')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. User authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden. Role '${req.user.role}' does not have permission.` });
    }

    next();
  };
}

/**
 * Scope Checker: Verifies if user has permission to access resources belonging to a specific warehouse.
 * Non-superadmins are strictly restricted to their assigned warehouse.
 */
export function warehouseScopeMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  // Superadmins can access anything
  if (req.user.role === 'superadmin') {
    return next();
  }

  const requestedWarehouseId = 
    req.query.warehouse_id || 
    req.body.warehouse_id || 
    req.params.warehouse_id || 
    req.params.id; // for warehouse detail routes

  if (!requestedWarehouseId) {
    // If no warehouse is specified, set user's warehouse scope automatically
    return next();
  }

  const reqId = parseInt(requestedWarehouseId as string, 10);

  if (req.user.warehouse_id !== reqId) {
    return res.status(403).json({ 
      error: `Forbidden. You only have access to warehouse ID ${req.user.warehouse_id}` 
    });
  }

  next();
}
