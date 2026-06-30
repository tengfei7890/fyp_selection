import type { Request, Response } from 'express';
import { prisma } from '@/prisma';

/** GET /api/notifications — 我的通知（最近 100 条，按时间倒序） */
export async function list(req: Request, res: Response) {
  const items = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(items);
}

/** GET /api/notifications/unread-count — 未读总数 */
export async function unreadCount(req: Request, res: Response) {
  const count = await prisma.notification.count({
    where: { userId: req.user!.id, readAt: null },
  });
  res.json({ count });
}

/** POST /api/notifications/mark-all-read — 全部标记已读 */
export async function markAllRead(req: Request, res: Response) {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ success: true });
}
