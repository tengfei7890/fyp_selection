import type { Request, Response } from 'express';
import { prisma } from '@/prisma';
import { ApiError } from '@/utils/ApiError';

/** GET /api/favorites/mine — 学生的收藏列表 */
export async function listMine(req: Request, res: Response) {
  const favorites = await prisma.favorite.findMany({
    where: { studentId: req.user!.id },
    include: {
      topic: {
        include: {
          teacher: { select: { name: true } },
          requirements: { include: { skill: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(favorites);
}

/** POST /api/favorites — 收藏课题 */
export async function create(req: Request, res: Response) {
  const { topicId } = req.body as { topicId: number };
  const studentId = req.user!.id;

  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) throw new ApiError(404, '课题不存在', 'NOT_FOUND');

  const favorite = await prisma.favorite
    .create({ data: { studentId, topicId } })
    .catch(() => null); // 已收藏则忽略（幂等）

  res.status(201).json({ success: true, favorited: true, favorite });
}

/** DELETE /api/favorites/:topicId — 取消收藏 */
export async function remove(req: Request, res: Response) {
  const topicId = parseInt(req.params.topicId, 10);
  await prisma.favorite
    .delete({ where: { studentId_topicId: { studentId: req.user!.id, topicId } } })
    .catch(() => null); // 不存在也视为成功（幂等）
  res.json({ success: true, favorited: false });
}
