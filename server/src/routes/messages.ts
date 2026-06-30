import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { asyncHandler } from '@/utils/ApiError';
import * as msg from '@/controllers/messages.controller';
import { Role } from '@shared/enums';

const router = Router();

// 仅教师与学生可使用站内信（管理员不参与）
router.use(authenticate, requireRole(Role.TEACHER, Role.STUDENT));

const sendSchema = z.object({
  receiverId: z.number().int().positive('收件人无效'),
  content: z.string().min(1, '消息内容不能为空').max(2000),
  topicId: z.number().int().positive().optional(),
});

router.get('/conversations', asyncHandler(msg.conversations));
router.get('/unread-count', asyncHandler(msg.unreadCount));
router.get('/with/:partnerId', asyncHandler(msg.thread));
router.post('/', validateBody(sendSchema), asyncHandler(msg.send));

export default router;
