import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '@/prisma';
import { paginate } from '@/utils/pagination';
import { hashPassword } from '@/utils/password';
import { ApiError } from '@/utils/ApiError';
import { publicUser } from '@/serializers';
import { Role, TopicStatus, UserStatus } from '@shared/enums';

/* ----------------------------- 用户管理 ----------------------------- */

/** GET /api/admin/users — 用户列表（可按角色/关键字筛选 + 分页） */
export async function listUsers(req: Request, res: Response) {
  const { page, pageSize, skip, take } = paginate(req);
  const role = req.query.role as Role | undefined;
  const q = (req.query.q as string | undefined)?.trim();

  const where: Prisma.UserWhereInput = {};
  if (role) where.role = role;
  if (q) {
    where.OR = [{ username: { contains: q } }, { name: { contains: q } }];
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { studentProfile: true },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ items: items.map(publicUser), total, page, pageSize });
}

/** POST /api/admin/users — 创建用户（学生则附带档案） */
export async function createUser(req: Request, res: Response) {
  const {
    username,
    password,
    role,
    name,
    email,
    phone,
    studentNo,
    major,
    gpa,
    grade,
  } = req.body as CreateUserInput;

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: hashPassword(password),
      role,
      name,
      email,
      phone,
    },
  });

  if (role === Role.STUDENT) {
    await prisma.studentProfile.create({
      data: {
        userId: user.id,
        studentNo: studentNo || username,
        major: major || '未填写',
        gpa,
        grade,
      },
    });
  }

  res.status(201).json(publicUser(user));
}

/** PUT /api/admin/users/:id — 更新用户（角色/状态/资料/密码） */
export async function updateUser(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  const { name, email, phone, role, status, password } = req.body as UpdateUserInput;

  const data: Prisma.UserUpdateInput = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined) data.email = email;
  if (phone !== undefined) data.phone = phone;
  if (role !== undefined) data.role = role;
  if (status !== undefined) data.status = status;
  if (password) data.passwordHash = hashPassword(password);

  const user = await prisma.user.update({ where: { id }, data });
  res.json(publicUser(user));
}

/** DELETE /api/admin/users/:id — 删除用户 */
export async function deleteUser(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (id === req.user!.id) throw new ApiError(400, '不能删除当前登录的管理员账号');
  await prisma.user.delete({ where: { id } });
  res.json({ success: true });
}

/* ----------------------------- 课题总览 ----------------------------- */

/** GET /api/admin/topics — 全部课题总览（含申请/已分配数量） */
export async function listTopics(req: Request, res: Response) {
  const { page, pageSize, skip, take } = paginate(req);
  const [items, total] = await Promise.all([
    prisma.topic.findMany({
      include: {
        teacher: { select: { id: true, name: true } },
        _count: { select: { applications: true, assignments: true } },
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.topic.count(),
  ]);
  res.json({ items, total, page, pageSize });
}

/* ----------------------------- 仪表盘统计 ----------------------------- */

/** GET /api/admin/stats — 管理员首页统计 */
export async function stats(_req: Request, res: Response) {
  const [users, topics, applications, assignments, openTopics, students] =
    await Promise.all([
      prisma.user.count(),
      prisma.topic.count(),
      prisma.application.count(),
      prisma.assignment.count(),
      prisma.topic.count({ where: { status: TopicStatus.OPEN } }),
      prisma.user.count({ where: { role: Role.STUDENT } }),
    ]);
  res.json({
    users,
    topics,
    applications,
    assignments,
    openTopics,
    students,
    unassignedStudents: Math.max(0, students - assignments),
  });
}

/* ----------------------------- 系统设置 ----------------------------- */

/** GET /api/admin/settings */
export async function getSettings(_req: Request, res: Response) {
  const settings =
    (await prisma.systemSetting.findUnique({ where: { id: 1 } })) ??
    (await prisma.systemSetting.create({ data: { id: 1 } }));
  res.json(settings);
}

/** PUT /api/admin/settings — 切换系统锁定状态/阶段 */
export async function updateSettings(req: Request, res: Response) {
  const { isLocked, phase } = req.body as { isLocked?: boolean; phase?: string };

  const data: Prisma.SystemSettingUpdateInput = {};
  if (isLocked !== undefined) data.isLocked = isLocked;
  if (phase !== undefined) data.phase = phase as never;

  const settings = await prisma.systemSetting.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, isLocked: isLocked ?? false, phase: (phase as never) ?? undefined },
  });
  res.json(settings);
}

interface CreateUserInput {
  username: string;
  password: string;
  role: Role;
  name: string;
  email?: string;
  phone?: string;
  studentNo?: string;
  major?: string;
  gpa?: number;
  grade?: string;
}

interface UpdateUserInput {
  name?: string;
  email?: string;
  phone?: string;
  role?: Role;
  status?: UserStatus;
  password?: string;
}
