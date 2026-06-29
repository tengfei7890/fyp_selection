import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { asyncHandler } from '@/utils/ApiError';
import * as skills from '@/controllers/skills.controller';
import { Role } from '@shared/enums';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(64),
  category: z.string().max(64).optional(),
});

router.get('/', authenticate, asyncHandler(skills.list));
router.post(
  '/',
  authenticate,
  requireRole(Role.ADMIN),
  validateBody(createSchema),
  asyncHandler(skills.create),
);

export default router;
