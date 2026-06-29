import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '@/prisma';
import { ApiError } from '@/utils/ApiError';
import { publicUser } from '@/serializers';
import { Role, UserStatus } from '@shared/enums';

interface ProfileInput {
  studentNo: string;
  major: string;
  gpa?: number | null;
  grade?: string | null;
  bio?: string | null;
  skillIds?: number[];
}

/** PUT /api/users/profile — 学生维护个人档案（学号/专业/GPA/年级/简介/技能库） */
export async function updateProfile(req: Request, res: Response) {
  const userId = req.user!.id;
  const { studentNo, major, gpa, grade, bio, skillIds } = req.body as ProfileInput;

  await prisma.$transaction(async (tx) => {
    await tx.studentProfile.upsert({
      where: { userId },
      update: { studentNo, major, gpa, grade, bio },
      create: { userId, studentNo, major, gpa, grade, bio },
    });

    if (skillIds !== undefined) {
      await tx.studentSkill.deleteMany({ where: { studentId: userId } });
      if (skillIds.length) {
        await tx.studentSkill.createMany({
          data: skillIds.map((skillId) => ({ studentId: userId, skillId })),
        });
      }
    }
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: {
        include: { skills: { include: { skill: true } } },
      },
    },
  });
  res.json(publicUser(user!));
}

/** GET /api/users/:id — 查看用户公开档案（教师查看申请人） */
export async function getById(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      studentProfile: {
        include: { skills: { include: { skill: true } } },
      },
    },
  });
  if (!user) throw new ApiError(404, '用户不存在');
  res.json(publicUser(user));
}

/** GET /api/users/students?q= — 搜索学生（教师直接指定 / 管理员改派用） */
export async function searchStudents(req: Request, res: Response) {
  const q = (req.query.q as string | undefined)?.trim();
  const where: Prisma.UserWhereInput = {
    role: Role.STUDENT,
    status: UserStatus.ACTIVE,
  };
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { username: { contains: q } },
      { studentProfile: { studentNo: { contains: q } } },
    ];
  }
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      username: true,
      studentProfile: { select: { studentNo: true, major: true, gpa: true } },
    },
    take: 50,
    orderBy: { name: 'asc' },
  });
  res.json(users);
}
