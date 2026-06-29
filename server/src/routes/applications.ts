import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '@/middleware/auth';
import { rejectIfLocked } from '@/middleware/systemLock';
import { validateBody } from '@/middleware/validate';
import { asyncHandler } from '@/utils/ApiError';
import * as applications from '@/controllers/applications.controller';
import { Role } from '@shared/enums';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  topicId: z.number().int().positive(),
  message: z.string().max(1000).optional(),
});

// 学生：我的申请
router.get('/mine', requireRole(Role.STUDENT), asyncHandler(applications.listMine));

// 教师/管理员：查看某课题的申请人
router.get('/', requireRole(Role.TEACHER, Role.ADMIN), asyncHandler(applications.listByTopic));

// 学生：提交申请（锁定时拒绝）
router.post(
  '/',
  requireRole(Role.STUDENT),
  rejectIfLocked,
  validateBody(createSchema),
  asyncHandler(applications.create),
);

// 学生：撤回申请
router.patch(
  '/:id/withdraw',
  requireRole(Role.STUDENT),
  rejectIfLocked,
  asyncHandler(applications.withdraw),
);

export default router;
