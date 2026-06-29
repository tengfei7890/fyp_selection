import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '@/middleware/auth';
import { rejectIfLocked } from '@/middleware/systemLock';
import { validateBody } from '@/middleware/validate';
import { asyncHandler } from '@/utils/ApiError';
import * as topics from '@/controllers/topics.controller';
import { Role, SelectionMode, TopicStatus } from '@shared/enums';

const router = Router();

router.use(authenticate);

const writeSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(191),
  description: z.string().min(1, '描述不能为空'),
  gpaThreshold: z.number().min(0).max(5).nullable().optional(),
  majorRestriction: z.string().max(191).nullable().optional(),
  capacity: z.number().int().min(1).max(20),
  selectionMode: z.enum([
    SelectionMode.DIRECT,
    SelectionMode.MUTUAL,
    SelectionMode.RANDOM,
    SelectionMode.RANGE_RANDOM,
  ]),
  academicYear: z.string().max(16).nullable().optional(),
  status: z
    .enum([
      TopicStatus.DRAFT,
      TopicStatus.OPEN,
      TopicStatus.SELECTING,
      TopicStatus.CLOSED,
      TopicStatus.LOCKED,
    ])
    .optional(),
  skillIds: z.array(z.number().int().positive()).optional(),
});

const statusSchema = z.object({
  status: z.enum([
    TopicStatus.DRAFT,
    TopicStatus.OPEN,
    TopicStatus.SELECTING,
    TopicStatus.CLOSED,
    TopicStatus.LOCKED,
  ]),
});

// 所有登录用户可浏览/查看详情
router.get('/', asyncHandler(topics.list));
router.get('/:id', asyncHandler(topics.getById));

// 课题写操作仅限教师
router.post(
  '/',
  requireRole(Role.TEACHER),
  rejectIfLocked,
  validateBody(writeSchema),
  asyncHandler(topics.create),
);
router.put(
  '/:id',
  requireRole(Role.TEACHER, Role.ADMIN),
  rejectIfLocked,
  validateBody(writeSchema),
  asyncHandler(topics.update),
);
router.patch(
  '/:id/status',
  requireRole(Role.TEACHER, Role.ADMIN),
  rejectIfLocked,
  validateBody(statusSchema),
  asyncHandler(topics.updateStatus),
);
router.delete(
  '/:id',
  requireRole(Role.TEACHER, Role.ADMIN),
  rejectIfLocked,
  asyncHandler(topics.remove),
);

export default router;
