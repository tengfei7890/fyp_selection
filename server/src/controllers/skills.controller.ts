import type { Request, Response } from 'express';
import { prisma } from '@/prisma';

/** GET /api/skills — 全部技能（供下拉多选） */
export async function list(_req: Request, res: Response) {
  const skills = await prisma.skill.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  res.json(skills);
}

/** POST /api/skills — 管理员新增技能 */
export async function create(req: Request, res: Response) {
  const { name, category } = req.body as { name: string; category?: string };
  const skill = await prisma.skill.create({ data: { name, category } });
  res.status(201).json(skill);
}
