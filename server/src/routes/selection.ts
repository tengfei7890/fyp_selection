import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '@/middleware/auth';
import { rejectIfLocked } from '@/middleware/systemLock';
import { validateBody } from '@/middleware/validate';
import { asyncHandler } from '@/utils/ApiError';
import * as sel from '@/controllers/selection.controller';
import { Role } from '@shared/enums';

const router = Router();
router.use(authenticate);

const criteriaSchema = z.object({
  criteria: z
    .object({
      gpaMin: z.number().min(0).max(5).optional().nullable(),
      majors: z.array(z.string()).optional(),
      candidateStudentIds: z.array(z.number().int().positive()).optional(),
    })
    .optional(),
});

const directSchema = z.object({
  studentIds: z.array(z.number().int().positive()).min(1, '至少选择一名学生'),
});

// 课题级选题执行：教师（自己课题）/ 管理员；教师锁定时被拒
router.post(
  '/topics/:id/select',
  requireRole(Role.TEACHER, Role.ADMIN),
  rejectIfLocked,
  validateBody(criteriaSchema),
  asyncHandler(sel.select),
);
router.post(
  '/topics/:id/assign-direct',
  requireRole(Role.TEACHER, Role.ADMIN),
  rejectIfLocked,
  validateBody(directSchema),
  asyncHandler(sel.assignDirect),
);
router.delete(
  '/topics/:id/assignments',
  requireRole(Role.TEACHER, Role.ADMIN),
  rejectIfLocked,
  asyncHandler(sel.clearAssignments),
);
router.get(
  '/topics/:id/assignments',
  requireRole(Role.TEACHER, Role.ADMIN),
  asyncHandler(sel.topicAssignments),
);

// MUTUAL：通过/拒绝申请
router.post(
  '/applications/:id/accept',
  requireRole(Role.TEACHER, Role.ADMIN),
  rejectIfLocked,
  asyncHandler(sel.accept),
);
router.post(
  '/applications/:id/reject',
  requireRole(Role.TEACHER, Role.ADMIN),
  rejectIfLocked,
  asyncHandler(sel.reject),
);

export default router;
