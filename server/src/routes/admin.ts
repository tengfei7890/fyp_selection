import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { asyncHandler } from '@/utils/ApiError';
import * as admin from '@/controllers/admin.controller';
import { Role, SelectionMode, SystemPhase, UserStatus } from '@shared/enums';

const router = Router();
router.use(authenticate, requireRole(Role.ADMIN));

const createUserSchema = z
  .object({
    username: z.string().min(1).max(64),
    password: z.string().min(6, '密码至少 6 位'),
    role: z.enum([Role.ADMIN, Role.TEACHER, Role.STUDENT]),
    name: z.string().min(1).max(64),
    email: z.string().email().max(191).optional(),
    phone: z.string().max(32).optional(),
    // 学生档案（仅 role=STUDENT 时使用）
    studentNo: z.string().max(32).optional(),
    major: z.string().max(64).optional(),
    gpa: z.number().min(0).max(5).optional(),
    grade: z.string().max(16).optional(),
  })
  .refine((d) => d.role !== Role.STUDENT || d.studentNo, {
    message: '创建学生时必须填写学号',
    path: ['studentNo'],
  });

const updateUserSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  email: z.string().email().max(191).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  role: z.enum([Role.ADMIN, Role.TEACHER, Role.STUDENT]).optional(),
  status: z.enum([UserStatus.ACTIVE, UserStatus.DISABLED]).optional(),
  password: z.string().min(6).optional(),
});

const settingsSchema = z.object({
  isLocked: z.boolean().optional(),
  phase: z.enum([SystemPhase.REGISTRATION, SystemPhase.BROWSING, SystemPhase.SELECTION, SystemPhase.LOCKED]).optional(),
});

router.get('/stats', asyncHandler(admin.stats));

router.get('/users', asyncHandler(admin.listUsers));
router.post('/users', validateBody(createUserSchema), asyncHandler(admin.createUser));
router.put('/users/:id', validateBody(updateUserSchema), asyncHandler(admin.updateUser));
router.delete('/users/:id', asyncHandler(admin.deleteUser));

router.get('/topics', asyncHandler(admin.listTopics));

router.get('/settings', asyncHandler(admin.getSettings));
router.put('/settings', validateBody(settingsSchema), asyncHandler(admin.updateSettings));

// 选题结果管理（锁定后亦可）
const createAssignmentSchema = z.object({
  studentId: z.number().int().positive(),
  topicId: z.number().int().positive(),
  method: z
    .enum([
      SelectionMode.DIRECT,
      SelectionMode.MUTUAL,
      SelectionMode.RANDOM,
      SelectionMode.RANGE_RANDOM,
    ])
    .optional(),
  note: z.string().max(500).optional(),
});
const updateAssignmentSchema = z.object({
  topicId: z.number().int().positive().optional(),
  note: z.string().max(500).nullable().optional(),
});

router.get('/assignments', asyncHandler(admin.listAssignments));
router.post(
  '/assignments',
  validateBody(createAssignmentSchema),
  asyncHandler(admin.createAssignment),
);
router.put(
  '/assignments/:id',
  validateBody(updateAssignmentSchema),
  asyncHandler(admin.updateAssignment),
);
router.delete('/assignments/:id', asyncHandler(admin.deleteAssignment));

export default router;
