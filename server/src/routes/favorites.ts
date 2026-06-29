import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { asyncHandler } from '@/utils/ApiError';
import * as favorites from '@/controllers/favorites.controller';
import { Role } from '@shared/enums';

const router = Router();
router.use(authenticate);

const createSchema = z.object({ topicId: z.number().int().positive() });

router.get('/mine', requireRole(Role.STUDENT), asyncHandler(favorites.listMine));
router.post(
  '/',
  requireRole(Role.STUDENT),
  validateBody(createSchema),
  asyncHandler(favorites.create),
);
router.delete('/:topicId', requireRole(Role.STUDENT), asyncHandler(favorites.remove));

export default router;
