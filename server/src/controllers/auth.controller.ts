import type { Request, Response } from 'express';
import { prisma } from '@/prisma';
import { comparePassword } from '@/utils/password';
import { signToken } from '@/utils/jwt';
import { ApiError } from '@/utils/ApiError';
import { publicUser } from '@/serializers';
import { UserStatus } from '@shared/enums';

/** POST /api/auth/login — 登录，返回 JWT 与用户信息 */
export async function login(req: Request, res: Response) {
  const { username, password } = req.body as { username: string; password: string };

  // 含学生档案：登录后前端可直接拿到 profile，避免 MyProfile 表单预填为空
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      studentProfile: {
        include: { skills: { include: { skill: true } } },
      },
    },
  });
  if (!user || user.status !== UserStatus.ACTIVE) {
    throw new ApiError(401, '账号不存在或已被禁用', 'INVALID_CREDENTIALS');
  }
  if (!comparePassword(password, user.passwordHash)) {
    throw new ApiError(401, '用户名或密码错误', 'INVALID_CREDENTIALS');
  }

  const token = signToken({
    userId: user.id,
    role: user.role,
    username: user.username,
    name: user.name,
  });

  res.json({ token, user: publicUser(user) });
}

/** GET /api/auth/me — 获取当前登录用户（含学生档案） */
export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      studentProfile: {
        include: { skills: { include: { skill: true } } },
      },
    },
  });
  if (!user) throw new ApiError(404, '用户不存在', 'NOT_FOUND');

  res.json(publicUser(user));
}
