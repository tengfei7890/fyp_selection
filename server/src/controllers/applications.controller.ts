import type { Request, Response } from 'express';
import { prisma } from '@/prisma';
import { ApiError } from '@/utils/ApiError';
import { notify } from '@/utils/notify';
import { isEligible } from '@/selection/eligibility';
import {
  ApplicationStatus,
  NotificationType,
  Role,
  TopicStatus,
} from '@shared/enums';

/** POST /api/applications — 学生申请课题 */
export async function create(req: Request, res: Response) {
  const { topicId, message } = req.body as { topicId: number; message?: string };
  const studentId = req.user!.id;

  // 抉择2：已有选题则禁止再申请
  const myAssignment = await prisma.assignment.findUnique({
    where: { studentId },
  });
  if (myAssignment) throw new ApiError(409, '你已有选题，无法再申请', 'ALREADY_ASSIGNED');

  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) throw new ApiError(404, '课题不存在', 'NOT_FOUND');
  if (!([TopicStatus.OPEN, TopicStatus.SELECTING] as TopicStatus[]).includes(topic.status)) {
    throw new ApiError(400, '该课题当前不接受申请', 'TOPIC_NOT_OPEN');
  }

  const existing = await prisma.application.findUnique({
    where: { studentId_topicId: { studentId, topicId } },
  });
  if (existing) throw new ApiError(409, '你已申请过该课题', 'DUPLICATE_APPLICATION');

  const application = await prisma.application.create({
    data: { studentId, topicId, message },
    include: { topic: { select: { id: true, title: true } } },
  });

  // 通知该课题教师：收到新申请
  await notify(
    topic.teacherId,
    NotificationType.NEW_APPLICATION,
    { studentName: req.user!.name, topicTitle: topic.title },
    'topic',
    topicId,
  );

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

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: { requirements: true },
  });
  if (!topic) throw new ApiError(404, '课题不存在', 'NOT_FOUND');
  if (req.user!.role === Role.TEACHER && topic.teacherId !== req.user!.id) {
    throw new ApiError(403, '无权查看该课题的申请人', 'FORBIDDEN');
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
          // 该生当前选题（一人一题，最多 1 条），用于解释"已拒绝"原因
          assignments: {
            select: { topicId: true, topic: { select: { title: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // 标记每位申请人是否满足课题要求（合格/不合格）
  const requiredSkillIds = topic.requirements.map((r) => r.skillId);
  const result = applications.map((a) => {
    const p = a.student.studentProfile;
    const eligible = p
      ? isEligible(
          {
            gpaThreshold: topic.gpaThreshold,
            majorRestriction: topic.majorRestriction,
            requiredSkillIds,
          },
          { gpa: p.gpa, major: p.major, skillIds: p.skills.map((s) => s.skillId) },
        )
      : false;
    return { ...a, eligible };
  });
  res.json(result);
}

/** PATCH /api/applications/:id/withdraw — 学生撤回申请 */
export async function withdraw(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  const application = await prisma.application.findUnique({ where: { id } });
  if (!application) throw new ApiError(404, '申请不存在', 'NOT_FOUND');
  if (application.studentId !== req.user!.id) {
    throw new ApiError(403, '无权操作该申请', 'FORBIDDEN');
  }

  const updated = await prisma.application.update({
    where: { id },
    data: { status: ApplicationStatus.WITHDRAWN },
  });
  res.json(updated);
}

/** GET /api/applications/my-result — 学生的最终选题结果（无则返回 null） */
export async function myResult(req: Request, res: Response) {
  const assignment = await prisma.assignment.findUnique({
    where: { studentId: req.user!.id },
    include: {
      topic: {
        include: { teacher: { select: { id: true, name: true } } },
      },
    },
  });
  res.json(assignment);
}
