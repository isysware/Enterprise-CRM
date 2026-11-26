import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, CapabilityKey, UserRole } from '../types';
import { AUTH_COOKIES } from '../constants';
import { TokenService, RbacService } from '../services';
import { AppError } from '../utils';

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // 1. Check HttpOnly Cookie first
    if (req.cookies && req.cookies[AUTH_COOKIES.ACCESS_TOKEN]) {
      token = req.cookies[AUTH_COOKIES.ACCESS_TOKEN];
    }
    // 2. Check Authorization Header fallback (Bearer token)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw AppError.unauthorized('Authentication credentials required');
    }

    // 3. Verify JWT signature & expiration
    const decoded = TokenService.verifyAccessToken(token);

    // 4. Verify Account Status
    if (decoded.status === 'inactive') {
      throw AppError.unauthorized('Account has been deactivated. Please contact Super Admin.');
    }

    // 5. Populate Auth Context
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      name: decoded.email.split('@')[0], // Base name, resolved by repository in full cycle
      role: decoded.role,
      status: decoded.status,
      isActive: decoded.status === 'active',
      teamId: decoded.teamId,
      createdAt: new Date().toISOString(),
    };

    // 6. Compute Effective RBAC Permissions & Organizational Hierarchy Scope
    req.permissions = RbacService.getEffectivePermissions(decoded.role);
    req.scope = RbacService.getHierarchyScope(req.user, [req.user], []);

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Enforces dynamic capability check against current actor's effective matrix
 */
export const requirePermission = (capability: CapabilityKey) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!req.permissions || !req.permissions[capability]) {
      return next(
        AppError.forbidden(
          `Forbidden: Role '${req.user.role}' lacks required capability '${capability}'`
        )
      );
    }

    next();
  };
};

/**
 * Enforces strict role boundary check
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Forbidden: Access restricted to roles: [${allowedRoles.join(', ')}]. Current role: '${req.user.role}'`
        )
      );
    }

    next();
  };
};

/**
 * Enforces active account status (rejects restricted or inactive)
 */
export const requireActiveAccount = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(AppError.unauthorized('Authentication required'));
  }

  if (req.user.status !== 'active') {
    return next(
      AppError.forbidden(
        `Forbidden: Action requires an active account. Current status: '${req.user.status}'`
      )
    );
  }

  next();
};

/**
 * Strict Super Admin check
 */
export const requireSuperAdmin = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(AppError.unauthorized('Authentication required'));
  }

  if (req.user.role !== 'Super Admin') {
    return next(AppError.forbidden('Forbidden: Action is strictly reserved for Super Admin'));
  }

  next();
};
