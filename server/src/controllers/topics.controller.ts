import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '@/prisma';
import { paginate } from '@/utils/pagination';
import { ApiError } from '@/utils/ApiError';
import { Role, SelectionMode, TopicStatus } from '@shared/enums';

const topicInclude = {
  teacher: { select: { id: true, name: true, username: true } },
  requirements: { include: { skill: { select: { id: true, name: true } } } },
  _count: {
    select: { applications: true, favorites: true, assignments: true },
  },
} satisfies Prisma.TopicInclude;

function buildWhere(req: Request): Prisma.TopicWhereInput {
  const role = req.user!.role;
  const q = (req.query.q as string | undefined)?.trim();
  const status = req.query.status as TopicStatus | undefined;
  const skillId = req.query.skillId ? Number(req.query.skillId) : undefined;
  const major = (req.query.major as string | undefined)?.trim();

  const where: Prisma.TopicWhereInput = {};

  if (role === Role.TEACHER) {
    where.teacherId = req.user!.id;
    if (status) where.status = status;
  } else if (role === Role.STUDENT) {
    // 学生仅可见开放/选题中的课题
    where.status = { in: [TopicStatus.OPEN, TopicStatus.SELECTING] };
  } else if (status) {
    where.status = status;
  }

  const and: Prisma.TopicWhereInput[] = [];
  if (q) {
    and.push({ OR: [{ title: { contains: q } }, { description: { contains: q } }] });
  }
  if (skillId) {
    // 仅返回要求了该技能的课题
    and.push({ requirements: { some: { skillId } } });
  }
  if (major) {
    // 专业要求中包含该关键词的课题
    and.push({ majorRestriction: { contains: major } });
  }
  if (and.length) where.AND = and;

  return where;
}

/** GET /api/topics — 列表（按角色控制可见范围）+ 关键词搜索 + 分页 */
export async function list(req: Request, res: Response) {
  const { page, pageSize, skip, take } = paginate(req);
  const where = buildWhere(req);

  const [items, total] = await Promise.all([
    prisma.topic.findMany({
      where,
      include: topicInclude,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.topic.count({ where }),
  ]);

  res.json({ items, total, page, pageSize });
}

/** GET /api/topics/:id — 详情 */
export async function getById(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  const topic = await prisma.topic.findUnique({
    where: { id },
    include: topicInclude,
  });
  if (!topic) throw new ApiError(404, '课题不存在');

  // 权限：教师只能看自己的；学生只能看开放/选题中的
  if (req.user!.role === Role.TEACHER && topic.teacherId !== req.user!.id) {
    throw new ApiError(403, '无权查看该课题');
  }
  if (
    req.user!.role === Role.STUDENT &&
    !([TopicStatus.OPEN, TopicStatus.SELECTING] as TopicStatus[]).includes(topic.status)
  ) {
    throw new ApiError(404, '课题不存在');
  }

  res.json(topic);
}

/** POST /api/topics — 教师创建课题 */
export async function create(req: Request, res: Response) {
  const {
    title,
    description,
    gpaThreshold,
    majorRestriction,
    capacity,
    selectionMode,
    academicYear,
    status,
    skillIds,
  } = req.body as TopicWriteInput;

  const topic = await prisma.topic.create({
    data: {
      teacherId: req.user!.id,
      title,
      description,
      gpaThreshold: gpaThreshold ?? null,
      majorRestriction: majorRestriction ?? null,
      capacity,
      selectionMode,
      academicYear: academicYear ?? null,
      status: status ?? TopicStatus.DRAFT,
      requirements: skillIds?.length
        ? { create: skillIds.map((skillId) => ({ skillId })) }
        : undefined,
    },
    include: topicInclude,
  });

  res.status(201).json(topic);
}

/** PUT /api/topics/:id — 教师更新自己的课题 */
export async function update(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  await ensureOwnTopic(id, req.user!.id, req.user!.role);

  const {
    title,
    description,
    gpaThreshold,
    majorRestriction,
    capacity,
    selectionMode,
    academicYear,
    status,
    skillIds,
  } = req.body as TopicWriteInput;

  const topic = await prisma.$transaction(async (tx) => {
    if (skillIds !== undefined) {
      await tx.topicSkillRequirement.deleteMany({ where: { topicId: id } });
    }
    return tx.topic.update({
      where: { id },
      data: {
        title,
        description,
        gpaThreshold,
        majorRestriction,
        capacity,
        selectionMode,
        academicYear,
        status,
        requirements:
          skillIds && skillIds.length
            ? { create: skillIds.map((skillId) => ({ skillId })) }
            : undefined,
      },
      include: topicInclude,
    });
  });

  res.json(topic);
}

/** PATCH /api/topics/:id/status — 教师切换课题状态（上架/下架等） */
export async function updateStatus(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  await ensureOwnTopic(id, req.user!.id, req.user!.role);
  const { status } = req.body as { status: TopicStatus };

  const topic = await prisma.topic.update({
    where: { id },
    data: { status },
    include: topicInclude,
  });
  res.json(topic);
}

/** DELETE /api/topics/:id — 教师删除自己的课题（级联清理申请/收藏） */
export async function remove(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  await ensureOwnTopic(id, req.user!.id, req.user!.role);
  await prisma.topic.delete({ where: { id } });
  res.json({ success: true });
}

async function ensureOwnTopic(topicId: number, userId: number, role: Role) {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: { teacherId: true },
  });
  if (!topic) throw new ApiError(404, '课题不存在');
  // 管理员可操作任意课题；教师仅限自己创建的
  if (role !== Role.ADMIN && topic.teacherId !== userId) {
    throw new ApiError(403, '无权操作该课题');
  }
}

export interface TopicWriteInput {
  title: string;
  description: string;
  gpaThreshold?: number | null;
  majorRestriction?: string | null;
  capacity: number;
  selectionMode: SelectionMode;
  academicYear?: string | null;
  status?: TopicStatus;
  skillIds?: number[];
}
