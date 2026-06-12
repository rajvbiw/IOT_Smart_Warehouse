import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_MIN_32_CHARS';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
    role: 'superadmin' | 'warehouse_manager' | 'operator' | 'viewer';
    warehouse_id: number | null;
  };
  file?: any;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      warehouse_id: decoded.warehouse_id,
    };
    next();
  } catch (err) {
    console.error('JWT Verification failed:', err);
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
}

export default authMiddleware;
