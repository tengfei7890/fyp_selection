import type { Request, Response } from 'express';
import { prisma } from '@/prisma';
import { ApiError } from '@/utils/ApiError';
import * as engine from '@/selection/engine';
import type { RangeCriteria } from '@/selection/engine';
import { notify } from '@/utils/notify';
import { audit } from '@/utils/audit';
import { NotificationType, Role, SelectionMode } from '@shared/enums';

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

async function topicTitle(topicId: number): Promise<string> {
  const t = await prisma.topic.findUnique({
    where: { id: topicId },
    select: { title: true },
  });
  return t?.title ?? '未知课题';
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

  let result;
  if (topic.selectionMode === SelectionMode.RANDOM) {
    result = await engine.runRandom(topicId, req.user!.id);
  } else if (topic.selectionMode === SelectionMode.RANGE_RANDOM) {
    result = await engine.runRangeRandom(topicId, criteria, req.user!.id);
  } else {
    throw new ApiError(400, '该课题模式不支持一键执行，请使用「通过/拒绝」或「直接指定」');
  }

  if (result.studentIds?.length) {
    const title = await topicTitle(topicId);
    for (const sid of result.studentIds) {
      await notify(
        sid,
        NotificationType.ASSIGNMENT_CREATED,
        `你已被确定为课题《${title}》`,
        'topic',
        topicId,
      );
    }
  }
  await audit(
    req.user!.id,
    `selection.${String(topic.selectionMode).toLowerCase()}`,
    'topic',
    topicId,
    `确定 ${result.assigned} 人`,
  );
  res.json(result);
}

/** POST /api/topics/:id/assign-direct — 教师直接指定学生 */
export async function assignDirect(req: Request, res: Response) {
  const topicId = parseInt(req.params.id, 10);
  await assertTopicAccess(topicId, req);
  const { studentIds } = req.body as { studentIds: number[] };
  const result = await engine.directAssign(topicId, studentIds, req.user!.id);

  if (result.studentIds?.length) {
    const title = await topicTitle(topicId);
    for (const sid of result.studentIds) {
      await notify(
        sid,
        NotificationType.ASSIGNMENT_CREATED,
        `教师已直接将你确定为课题《${title}》`,
        'topic',
        topicId,
      );
    }
  }
  await audit(req.user!.id, 'selection.direct', 'topic', topicId, `指定 ${result.assigned} 人`);
  res.json(result);
}

/** DELETE /api/topics/:id/assignments — 清空该课题选题结果（重选） */
export async function clearAssignments(req: Request, res: Response) {
  const topicId = parseInt(req.params.id, 10);
  await assertTopicAccess(topicId, req);
  const result = await engine.clearTopicAssignments(topicId);

  if (result.studentIds?.length) {
    const title = await topicTitle(topicId);
    for (const sid of result.studentIds) {
      await notify(
        sid,
        NotificationType.ASSIGNMENT_CLEARED,
        `课题《${title}》的选题结果已被清空，可重新选题`,
        'topic',
        topicId,
      );
    }
  }
  await audit(req.user!.id, 'selection.clear', 'topic', topicId, `清空 ${result.cleared} 人`);
  res.json(result);
}

/** POST /api/applications/:id/accept — MUTUAL 通过申请 */
export async function accept(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  await assertApplicationAccess(id, req);
  const result = await engine.mutualAccept(id, req.user!.id);
  const title = await topicTitle(result.topicId);
  await notify(
    result.studentId,
    NotificationType.APPLICATION_ACCEPTED,
    `教师通过了你对《${title}》的申请`,
    'topic',
    result.topicId,
  );
  await audit(req.user!.id, 'selection.mutual_accept', 'application', id, title);
  res.json(result);
}

/** POST /api/applications/:id/reject — MUTUAL 拒绝申请 */
export async function reject(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  await assertApplicationAccess(id, req);
  const result = await engine.mutualReject(id);
  const title = await topicTitle(result.topicId);
  await notify(
    result.studentId,
    NotificationType.APPLICATION_REJECTED,
    `教师拒绝了你对《${title}》的申请`,
    'topic',
    result.topicId,
  );
  await audit(req.user!.id, 'selection.mutual_reject', 'application', id, title);
  res.json(result);
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
