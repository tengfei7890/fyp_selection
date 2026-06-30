import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '@/prisma';
import { ApiError } from '@/utils/ApiError';
import { Role } from '@shared/enums';

const userSelect = { id: true, name: true, role: true } as const;

/** 校验：仅 教师↔学生 可互发；返回收件人。 */
async function assertCanMessage(senderId: number, receiverId: number) {
  const [sender, receiver] = await Promise.all([
    prisma.user.findUnique({ where: { id: senderId }, select: { role: true } }),
    prisma.user.findUnique({ where: { id: receiverId }, select: userSelect }),
  ]);
  if (!receiver) throw new ApiError(404, '收件人不存在');
  const roles = new Set([sender!.role, receiver.role]);
  if (!(roles.has(Role.TEACHER) && roles.has(Role.STUDENT))) {
    throw new ApiError(403, '仅支持教师与学生之间互发消息');
  }
  return receiver;
}

/** 批量取课题标题，返回 { id: title } 映射。 */
async function topicTitleMap(ids: number[]): Promise<Record<number, string | null>> {
  if (!ids.length) return {};
  const topics = await prisma.topic.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true },
  });
  return Object.fromEntries(topics.map((t) => [t.id, t.title]));
}

/** GET /api/messages/conversations — 当前用户会话列表（按最后消息时间倒序） */
export async function conversations(req: Request, res: Response) {
  const me = req.user!.id;
  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: me }, { receiverId: me }] },
    orderBy: { createdAt: 'desc' },
    include: { sender: { select: userSelect }, receiver: { select: userSelect } },
  });

  const map = new Map<
    number,
    {
      partner: { id: number; name: string; role: string };
      lastMessage: { content: string; createdAt: Date; senderId: number } | null;
      unread: number;
    }
  >();

  for (const m of messages) {
    const partnerId = m.senderId === me ? m.receiverId : m.senderId;
    const partner = m.senderId === me ? m.receiver : m.sender;
    let conv = map.get(partnerId);
    if (!conv) {
      conv = { partner, lastMessage: null, unread: 0 };
      map.set(partnerId, conv);
    }
    // messages 已按 createdAt desc，首个即为最后一条
    if (!conv.lastMessage) {
      conv.lastMessage = { content: m.content, createdAt: m.createdAt, senderId: m.senderId };
    }
    if (m.receiverId === me && !m.readAt) conv.unread += 1;
  }

  const list = [...map.values()].sort((a, b) =>
    (b.lastMessage?.createdAt ?? new Date(0)) > (a.lastMessage?.createdAt ?? new Date(0))
      ? 1
      : -1,
  );
  res.json(list);
}

/** GET /api/messages/with/:partnerId — 与某用户的完整会话；打开即把对方未读消息标已读 */
export async function thread(req: Request, res: Response) {
  const me = req.user!.id;
  const partnerId = parseInt(req.params.partnerId, 10);
  const topicId = req.query.topicId ? parseInt(req.query.topicId as string, 10) : undefined;

  await assertCanMessage(me, partnerId);

  const where: Prisma.MessageWhereInput = {
    OR: [
      { senderId: me, receiverId: partnerId },
      { senderId: partnerId, receiverId: me },
    ],
  };
  if (topicId) where.topicId = topicId;

  const messages = await prisma.message.findMany({ where, orderBy: { createdAt: 'asc' } });

  // 标记对方发来的未读消息为已读
  await prisma.message.updateMany({
    where: { senderId: partnerId, receiverId: me, readAt: null },
    data: { readAt: new Date() },
  });

  const tmap = await topicTitleMap(
    [...new Set(messages.map((m) => m.topicId).filter((x): x is number => x != null))],
  );
  res.json(
    messages.map((m) => ({
      ...m,
      topic: m.topicId ? { id: m.topicId, title: tmap[m.topicId] ?? null } : null,
    })),
  );
}

/** POST /api/messages — 发送消息 */
export async function send(req: Request, res: Response) {
  const me = req.user!.id;
  const { receiverId, content, topicId } = req.body as {
    receiverId: number;
    content: string;
    topicId?: number;
  };

  const receiver = await assertCanMessage(me, receiverId);
  const message = await prisma.message.create({
    data: { senderId: me, receiverId, content: content.trim(), topicId: topicId ?? null },
  });

  let topic: { id: number; title: string | null } | null = null;
  if (topicId) {
    const t = await prisma.topic.findUnique({ where: { id: topicId }, select: { title: true } });
    topic = { id: topicId, title: t?.title ?? null };
  }

  res.status(201).json({ ...message, topic, receiver });
}

/** GET /api/messages/unread-count — 未读总数 */
export async function unreadCount(req: Request, res: Response) {
  const me = req.user!.id;
  const count = await prisma.message.count({ where: { receiverId: me, readAt: null } });
  res.json({ count });
}

/** GET /api/messages/topics-with/:partnerId — 该师生对相关联的课题（学生已申请、且属于该教师） */
export async function contextTopics(req: Request, res: Response) {
  const me = req.user!.id;
  const partnerId = parseInt(req.params.partnerId, 10);
  await assertCanMessage(me, partnerId);

  const meIsStudent = req.user!.role === Role.STUDENT;
  const studentId = meIsStudent ? me : partnerId;
  const teacherId = meIsStudent ? partnerId : me;

  const apps = await prisma.application.findMany({
    where: { studentId, topic: { teacherId } },
    include: { topic: { select: { id: true, title: true } } },
  });
  const seen = new Set<number>();
  const topics: { id: number; title: string }[] = [];
  for (const a of apps) {
    if (a.topic && !seen.has(a.topic.id)) {
      seen.add(a.topic.id);
      topics.push(a.topic);
    }
  }
  res.json(topics);
}
