import type { RequestHandler } from 'express';
import { prisma } from '@/prisma';
import { ApiError } from '@/utils/ApiError';
import { Role } from '@shared/enums';

/**
 * 系统锁定守卫：当 SystemSetting.isLocked=true 时，
 * 阻止非管理员用户的写操作（管理员可继续维护/修正数据）。
 */
export const rejectIfLocked: RequestHandler = async (req, _res, next) => {
  try {
    if (req.user?.role === Role.ADMIN) return next();
    const setting = await prisma.systemSetting.findUnique({ where: { id: 1 } });
    if (setting?.isLocked) {
      return next(new ApiError(403, '系统已锁定，当前阶段不可修改'));
    }
    next();
  } catch (err) {
    next(err);
  }
};
