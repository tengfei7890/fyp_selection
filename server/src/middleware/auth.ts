import type { RequestHandler } from 'express';
import { verifyToken } from '@/utils/jwt';
import { ApiError } from '@/utils/ApiError';
import type { Role } from '@shared/enums';

/** 解析 Bearer Token，校验后将用户信息挂到 req.user。 */
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new ApiError(401, '未登录或缺少令牌'));
  }
  try {
    const payload = verifyToken(header.slice('Bearer '.length).trim());
    req.user = {
      id: payload.userId,
      role: payload.role,
      username: payload.username,
      name: payload.name,
    };
    next();
  } catch {
    next(new ApiError(401, '登录已过期，请重新登录'));
  }
};

/** 角色守卫：仅允许指定角色通过。需在 authenticate 之后使用。 */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, '未登录'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, '权限不足，无法访问该资源'));
    }
    next();
  };
