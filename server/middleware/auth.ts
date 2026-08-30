import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dayflow_super_secret_jwt_key_hackathon_2026';

export interface AuthUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'HR' | 'EMPLOYEE';
  employee_id: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access token required. Please sign in.',
      errorCode: 'UNAUTHORIZED',
    });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || !decoded) {
      res.status(403).json({
        success: false,
        message: 'Invalid or expired session token. Please sign in again.',
        errorCode: 'FORBIDDEN',
      });
      return;
    }
    req.user = decoded as AuthUser;
    next();
  });
}

export function requireRole(allowedRoles: Array<'ADMIN' | 'HR' | 'EMPLOYEE'>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
        errorCode: 'UNAUTHORIZED',
      });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Permission denied. Access requires [${allowedRoles.join(', ')}] role.`,
        errorCode: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }
    next();
  };
}

export function requireSelfOrAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required.',
      errorCode: 'UNAUTHORIZED',
    });
    return;
  }

  const requestedEmpId = req.params.id || req.params.employeeId || req.query.employeeId;

  // Admins and HR can access any employee record
  if (['ADMIN', 'HR'].includes(req.user.role)) {
    next();
    return;
  }

  // Employees can ONLY access their own employee record
  if (requestedEmpId && requestedEmpId !== req.user.employee_id) {
    res.status(403).json({
      success: false,
      message: 'Access denied: Employees can only view or manage their own records.',
      errorCode: 'FORBIDDEN_RESOURCE_ACCESS',
    });
    return;
  }

  next();
}
