import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { asyncHandler } from '@/utils/ApiError';
import * as n from '@/controllers/notifications.controller';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(n.list));
router.get('/unread-count', asyncHandler(n.unreadCount));
router.post('/mark-all-read', asyncHandler(n.markAllRead));

export default router;
