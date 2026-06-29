import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { asyncHandler } from '@/utils/ApiError';
import * as users from '@/controllers/users.controller';
import { Role } from '@shared/enums';

const router = Router();
router.use(authenticate);

const profileSchema = z.object({
  studentNo: z.string().min(1, '学号不能为空').max(32),
  major: z.string().min(1, '专业不能为空').max(64),
  gpa: z.number().min(0).max(5).nullable().optional(),
  grade: z.string().max(16).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  skillIds: z.array(z.number().int().positive()).optional(),
});

// 学生：维护个人档案
router.put(
  '/profile',
  requireRole(Role.STUDENT),
  validateBody(profileSchema),
  asyncHandler(users.updateProfile),
);

// 教师/管理员：查看用户公开档案
router.get(
  '/students',
  requireRole(Role.TEACHER, Role.ADMIN),
  asyncHandler(users.searchStudents),
);
router.get(
  '/:id',
  requireRole(Role.TEACHER, Role.ADMIN),
  asyncHandler(users.getById),
);

export default router;
