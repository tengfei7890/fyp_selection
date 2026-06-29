import type { Request, Response } from 'express';
import { prisma } from '@/prisma';
import { ApiError } from '@/utils/ApiError';
import { ApplicationStatus, Role, TopicStatus } from '@shared/enums';

/** POST /api/applications — 学生申请课题 */
export async function create(req: Request, res: Response) {
  const { topicId, message } = req.body as { topicId: number; message?: string };
  const studentId = req.user!.id;

  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) throw new ApiError(404, '课题不存在');
  if (!([TopicStatus.OPEN, TopicStatus.SELECTING] as TopicStatus[]).includes(topic.status)) {
    throw new ApiError(400, '该课题当前不接受申请');
  }

  const existing = await prisma.application.findUnique({
    where: { studentId_topicId: { studentId, topicId } },
  });
  if (existing) throw new ApiError(409, '你已申请过该课题');

  const application = await prisma.application.create({
    data: { studentId, topicId, message },
    include: { topic: { select: { id: true, title: true } } },
  });
  res.status(201).json(application);
}

/** GET /api/applications/mine — 学生的申请列表 */
export async function listMine(req: Request, res: Response) {
  const applications = await prisma.application.findMany({
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
  res.json(applications);
}

/** GET /api/applications?topicId= — 教师查看某课题的申请人 */
export async function listByTopic(req: Request, res: Response) {
  const topicId = parseInt(req.query.topicId as string, 10);
  if (!topicId) throw new ApiError(400, '缺少 topicId 参数');

  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) throw new ApiError(404, '课题不存在');
  if (req.user!.role === Role.TEACHER && topic.teacherId !== req.user!.id) {
    throw new ApiError(403, '无权查看该课题的申请人');
  }

  const applications = await prisma.application.findMany({
    where: { topicId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          username: true,
          studentProfile: {
            include: {
              skills: { include: { skill: { select: { name: true } } } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(applications);
}

/** PATCH /api/applications/:id/withdraw — 学生撤回申请 */
export async function withdraw(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  const application = await prisma.application.findUnique({ where: { id } });
  if (!application) throw new ApiError(404, '申请不存在');
  if (application.studentId !== req.user!.id) {
    throw new ApiError(403, '无权操作该申请');
  }

  const updated = await prisma.application.update({
    where: { id },
    data: { status: ApplicationStatus.WITHDRAWN },
  });
  res.json(updated);
}
