import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthenticatedRequest, CapabilityKey, UserRole, AuthUser, AccountStatus } from '../types';
import { AUTH_COOKIES } from '../constants';
import { TokenService, RbacService } from '../services';
import { AppError } from '../utils';
import { query } from '../database/connection';

export const authenticate: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  try {
    let token: string | undefined;

    // 1. Check HttpOnly Cookie first
    if (authReq.cookies && authReq.cookies[AUTH_COOKIES.ACCESS_TOKEN]) {
      token = authReq.cookies[AUTH_COOKIES.ACCESS_TOKEN];
    } else if (authReq.signedCookies && authReq.signedCookies[AUTH_COOKIES.ACCESS_TOKEN]) {
      token = authReq.signedCookies[AUTH_COOKIES.ACCESS_TOKEN];
    }

    // 2. Check Authorization Header fallback (Bearer token)
    if (!token) {
      const authHeader = (authReq.headers.authorization || authReq.headers.Authorization) as string | undefined;
      if (authHeader && typeof authHeader === 'string' && authHeader.trim().toLowerCase().startsWith('bearer ')) {
        token = authHeader.trim().slice(7).trim();
      }
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
    authReq.user = {
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
    authReq.permissions = RbacService.getEffectivePermissions(decoded.role);
    if (decoded.role === 'Manager' || decoded.role === 'Team Lead') {
      try {
        const [usersRes, teamsRes] = await Promise.all([
          query<{
            id: string;
            name: string;
            email: string;
            role_name: string;
            team_id: string | null;
            manager_id: string | null;
            team_lead_id: string | null;
            status: string;
          }>(
            "SELECT id, name, email, role_name, team_id, manager_id, team_lead_id, status FROM users WHERE status != 'inactive'"
          ),
          query<{ id: string; manager_id: string | null; team_lead_id: string | null; status: string }>(
            "SELECT id, manager_id, team_lead_id, status FROM teams WHERE status = 'active'"
          ),
        ]);
        const orgUsers: AuthUser[] = usersRes.rows.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          role: r.role_name as UserRole,
          status: r.status as AccountStatus,
          isActive: r.status === 'active',
          teamId: r.team_id || undefined,
          managerId: r.manager_id || undefined,
          teamLeadId: r.team_lead_id || undefined,
          createdAt: new Date().toISOString(),
        }));
        const orgTeams = teamsRes.rows.map((r) => ({
          id: r.id,
          managerId: r.manager_id || undefined,
          leaderId: r.team_lead_id || undefined,
        }));
        authReq.scope = RbacService.getHierarchyScope(authReq.user, orgUsers, orgTeams);
      } catch {
        authReq.scope = RbacService.getHierarchyScope(authReq.user, [authReq.user], []);
      }
    } else {
      authReq.scope = RbacService.getHierarchyScope(authReq.user, [authReq.user], []);
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Enforces dynamic capability check against current actor's effective matrix
 */
export const requirePermission = (capability: CapabilityKey): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!authReq.permissions || !authReq.permissions[capability]) {
      return next(
        AppError.forbidden(
          `Forbidden: Role '${authReq.user.role}' lacks required capability '${capability}'`
        )
      );
    }

    next();
  };
};

/**
 * Enforces strict role boundary check
 */
export const requireRole = (...allowedRoles: UserRole[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(authReq.user.role)) {
      return next(
        AppError.forbidden(
          `Forbidden: Access restricted to roles: [${allowedRoles.join(', ')}]. Current role: '${authReq.user.role}'`
        )
      );
    }

    next();
  };
};

/**
 * Enforces active account status (rejects restricted or inactive)
 */
export const requireActiveAccount: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    return next(AppError.unauthorized('Authentication required'));
  }

  if (authReq.user.status !== 'active') {
    return next(
      AppError.forbidden(
        `Forbidden: Action requires an active account. Current status: '${authReq.user.status}'`
      )
    );
  }

  next();
};

/**
 * Strict Super Admin check
 */
export const requireSuperAdmin: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    return next(AppError.unauthorized('Authentication required'));
  }

  if (authReq.user.role !== 'Super Admin') {
    return next(AppError.forbidden('Forbidden: Action is strictly reserved for Super Admin'));
  }

  next();
};
