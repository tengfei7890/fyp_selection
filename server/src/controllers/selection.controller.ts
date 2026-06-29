import type { Request, Response } from 'express';
import { prisma } from '@/prisma';
import { ApiError } from '@/utils/ApiError';
import * as engine from '@/selection/engine';
import type { RangeCriteria } from '@/selection/engine';
import { Role, SelectionMode } from '@shared/enums';

/** 教师只能操作自己的课题；管理员任意。 */
async function assertTopicAccess(topicId: number, req: Request) {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: { teacherId: true },
  });
  if (!topic) throw new ApiError(404, '课题不存在');
  if (req.user!.role === Role.TEACHER && topic.teacherId !== req.user!.id) {
    throw new ApiError(403, '无权操作该课题');
  }
}

/** 通过申请反查所属课题，做归属校验。 */
async function assertApplicationAccess(applicationId: number, req: Request) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { topic: { select: { teacherId: true } } },
  });
  if (!app) throw new ApiError(404, '申请不存在');
  if (req.user!.role === Role.TEACHER && app.topic.teacherId !== req.user!.id) {
    throw new ApiError(403, '无权操作该申请');
  }
}

/** POST /api/topics/:id/select — 按课题模式执行随机/范围随机选题 */
export async function select(req: Request, res: Response) {
  const topicId = parseInt(req.params.id, 10);
  await assertTopicAccess(topicId, req);

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: { selectionMode: true },
  });
  if (!topic) throw new ApiError(404, '课题不存在');

  const criteria = (req.body?.criteria ?? {}) as RangeCriteria;

  if (topic.selectionMode === SelectionMode.RANDOM) {
    res.json(await engine.runRandom(topicId, req.user!.id));
  } else if (topic.selectionMode === SelectionMode.RANGE_RANDOM) {
    res.json(await engine.runRangeRandom(topicId, criteria, req.user!.id));
  } else {
    throw new ApiError(
      400,
      '该课题模式不支持一键执行，请使用「通过/拒绝」或「直接指定」',
    );
  }
}

/** POST /api/topics/:id/assign-direct — 教师直接指定学生 */
export async function assignDirect(req: Request, res: Response) {
  const topicId = parseInt(req.params.id, 10);
  await assertTopicAccess(topicId, req);
  const { studentIds } = req.body as { studentIds: number[] };
  res.json(await engine.directAssign(topicId, studentIds, req.user!.id));
}

/** DELETE /api/topics/:id/assignments — 清空该课题选题结果（重选） */
export async function clearAssignments(req: Request, res: Response) {
  const topicId = parseInt(req.params.id, 10);
  await assertTopicAccess(topicId, req);
  res.json(await engine.clearTopicAssignments(topicId));
}

/** GET /api/topics/:id/assignments — 某课题的已定稿名单 */
export async function topicAssignments(req: Request, res: Response) {
  const topicId = parseInt(req.params.id, 10);
  await assertTopicAccess(topicId, req);
  const assignments = await prisma.assignment.findMany({
    where: { topicId },
    include: {
      student: { select: { id: true, name: true, username: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(assignments);
}

/** POST /api/applications/:id/accept — MUTUAL 通过申请 */
export async function accept(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  await assertApplicationAccess(id, req);
  res.json(await engine.mutualAccept(id, req.user!.id));
}

/** POST /api/applications/:id/reject — MUTUAL 拒绝申请 */
export async function reject(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  await assertApplicationAccess(id, req);
  res.json(await engine.mutualReject(id));
}
