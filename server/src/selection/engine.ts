/**
 * 选题引擎：四种模式最终都通过 assignStudent 原语产出 Assignment。
 *
 * 级联（抉择2）：学生被确定后，其对本课题的 PENDING 申请→ACCEPTED，
 *               对其他课题的 PENDING 申请→REJECTED；并因 Assignment.studentId
 *               唯一约束天然保证"一人一题"。
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/prisma';
import { ApiError } from '@/utils/ApiError';
import {
  ApplicationStatus,
  SelectionMode,
  TopicStatus,
} from '@shared/enums';
import { isEligible } from './eligibility';

type Tx = Prisma.TransactionClient;

export interface RangeCriteria {
  gpaMin?: number | null;
  majors?: string[];
  candidateStudentIds?: number[];
}

export interface AssignParams {
  topicId: number;
  studentId: number;
  method: SelectionMode;
  assignedBy: number;
  note?: string;
}

/** 核心：把一名学生分配到课题（含级联）。须在事务内调用。 */
export async function assignStudent(tx: Tx, params: AssignParams): Promise<void> {
  const { topicId, studentId, method, assignedBy, note } = params;

  // 一人一题：若已分配则拒绝
  const existing = await tx.assignment.findUnique({ where: { studentId } });
  if (existing) {
    throw new ApiError(409, '该学生已有选题，无法重复分配');
  }

  await tx.assignment.create({
    data: { studentId, topicId, method, assignedBy, note },
  });

  // 级联：本课题申请→ACCEPTED，其他课题 PENDING 申请→REJECTED(cascade)
  await tx.application.updateMany({
    where: { studentId, topicId, status: ApplicationStatus.PENDING },
    data: { status: ApplicationStatus.ACCEPTED, rejectReason: null },
  });
  await tx.application.updateMany({
    where: {
      studentId,
      status: ApplicationStatus.PENDING,
      topicId: { not: topicId },
    },
    data: { status: ApplicationStatus.REJECTED, rejectReason: 'cascade' },
  });
}

/** 取某课题的合格 PENDING 申请人（含档案+技能）。须在事务内调用。 */
async function eligibleApplicants(tx: Tx, topicId: number) {
  const topic = await tx.topic.findUnique({
    where: { id: topicId },
    include: { requirements: true },
  });
  if (!topic) throw new ApiError(404, '课题不存在');

  const apps = await tx.application.findMany({
    where: { topicId, status: ApplicationStatus.PENDING },
    include: {
      student: {
        include: {
          studentProfile: { include: { skills: true } },
        },
      },
    },
  });

  const requiredSkillIds = topic.requirements.map((r) => r.skillId);
  const eligible = apps.filter((a) => {
    const p = a.student.studentProfile;
    if (!p) return false;
    return isEligible(
      {
        gpaThreshold: topic.gpaThreshold,
        majorRestriction: topic.majorRestriction,
        requiredSkillIds,
      },
      { gpa: p.gpa, major: p.major, skillIds: p.skills.map((s) => s.skillId) },
    );
  });

  return { topic, eligible };
}

/** RANDOM：从合格申请人中随机抽取至满员。 */
export async function runRandom(topicId: number, actorId: number) {
  return prisma.$transaction(async (tx) => {
    const { topic, eligible } = await eligibleApplicants(tx, topicId);
    const assignedCount = await tx.assignment.count({ where: { topicId } });
    const remaining = topic.capacity - assignedCount;
    if (remaining <= 0) throw new ApiError(400, '该课题已满员');
    if (eligible.length === 0) throw new ApiError(400, '没有符合条件的申请人');

    const picked = shuffle(eligible).slice(0, remaining);
    for (const a of picked) {
      await assignStudent(tx, {
        topicId,
        studentId: a.studentId,
        method: SelectionMode.RANDOM,
        assignedBy: actorId,
      });
    }

    const totalAssigned = assignedCount + picked.length;
    if (totalAssigned >= topic.capacity) {
      await tx.topic.update({
        where: { id: topicId },
        data: { status: TopicStatus.CLOSED },
      });
    }
    return { assigned: picked.length, totalAssigned };
  });
}

/** RANGE_RANDOM：在合格申请人上再叠加 criteria 后随机。 */
export async function runRangeRandom(
  topicId: number,
  criteria: RangeCriteria,
  actorId: number,
) {
  return prisma.$transaction(async (tx) => {
    const { topic, eligible } = await eligibleApplicants(tx, topicId);
    const assignedCount = await tx.assignment.count({ where: { topicId } });
    const remaining = topic.capacity - assignedCount;
    if (remaining <= 0) throw new ApiError(400, '该课题已满员');

    let pool = eligible;
    if (criteria.gpaMin != null) {
      pool = pool.filter(
        (a) => (a.student.studentProfile?.gpa ?? 0) >= criteria.gpaMin!,
      );
    }
    if (criteria.majors?.length) {
      pool = pool.filter((a) =>
        criteria.majors!.includes(a.student.studentProfile?.major ?? ''),
      );
    }
    if (criteria.candidateStudentIds?.length) {
      pool = pool.filter((a) =>
        criteria.candidateStudentIds!.includes(a.studentId),
      );
    }
    if (pool.length === 0) {
      throw new ApiError(400, '指定范围内没有符合条件的申请人');
    }

    const picked = shuffle(pool).slice(0, remaining);
    for (const a of picked) {
      await assignStudent(tx, {
        topicId,
        studentId: a.studentId,
        method: SelectionMode.RANGE_RANDOM,
        assignedBy: actorId,
      });
    }

    const totalAssigned = assignedCount + picked.length;
    if (totalAssigned >= topic.capacity) {
      await tx.topic.update({
        where: { id: topicId },
        data: { status: TopicStatus.CLOSED },
      });
    }
    return { assigned: picked.length, totalAssigned };
  });
}

/** DIRECT：教师直接指定任意学生（不超容量）。 */
export async function directAssign(
  topicId: number,
  studentIds: number[],
  actorId: number,
) {
  return prisma.$transaction(async (tx) => {
    const topic = await tx.topic.findUnique({ where: { id: topicId } });
    if (!topic) throw new ApiError(404, '课题不存在');
    const assignedCount = await tx.assignment.count({ where: { topicId } });
    const remaining = topic.capacity - assignedCount;
    if (remaining <= 0) throw new ApiError(400, '该课题已满员');

    let created = 0;
    for (const studentId of studentIds) {
      if (created >= remaining) break;
      await assignStudent(tx, {
        topicId,
        studentId,
        method: SelectionMode.DIRECT,
        assignedBy: actorId,
      });
      created++;
    }

    if (assignedCount + created >= topic.capacity) {
      await tx.topic.update({
        where: { id: topicId },
        data: { status: TopicStatus.CLOSED },
      });
    }
    return { assigned: created, skipped: studentIds.length - created };
  });
}

/** MUTUAL：教师通过某申请 → 学生定稿。 */
export async function mutualAccept(applicationId: number, actorId: number) {
  return prisma.$transaction(async (tx) => {
    const app = await tx.application.findUnique({
      where: { id: applicationId },
      include: { topic: true },
    });
    if (!app) throw new ApiError(404, '申请不存在');
    if (app.status !== ApplicationStatus.PENDING) {
      throw new ApiError(400, '该申请已处理');
    }
    const assignedCount = await tx.assignment.count({
      where: { topicId: app.topicId },
    });
    if (assignedCount >= app.topic.capacity) {
      throw new ApiError(400, '该课题已满员');
    }

    await assignStudent(tx, {
      topicId: app.topicId,
      studentId: app.studentId,
      method: SelectionMode.MUTUAL,
      assignedBy: actorId,
    });

    if (assignedCount + 1 >= app.topic.capacity) {
      await tx.topic.update({
        where: { id: app.topicId },
        data: { status: TopicStatus.CLOSED },
      });
    }
    return { success: true };
  });
}

/** MUTUAL：教师拒绝某申请。 */
export async function mutualReject(applicationId: number) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
  });
  if (!app) throw new ApiError(404, '申请不存在');
  if (app.status !== ApplicationStatus.PENDING) {
    throw new ApiError(400, '该申请已处理');
  }
  await prisma.application.update({
    where: { id: applicationId },
    data: { status: ApplicationStatus.REJECTED, rejectReason: 'manual' },
  });
  return { success: true };
}

/** 清空某课题全部选题结果（重选），并回滚相关申请状态。 */
export async function clearTopicAssignments(topicId: number) {
  return prisma.$transaction(async (tx) => {
    // 先记录被释放的学生（一人一题，清空后他们将不再有选题）
    const freed = await tx.assignment.findMany({
      where: { topicId },
      select: { studentId: true },
    });
    const freedIds = freed.map((a) => a.studentId);

    const result = await tx.assignment.deleteMany({ where: { topicId } });

    // 回滚：本课题因被选中而 ACCEPTED 的申请 → PENDING，便于重新处理
    await tx.application.updateMany({
      where: { topicId, status: ApplicationStatus.ACCEPTED },
      data: { status: ApplicationStatus.PENDING, rejectReason: null },
    });

    // 回滚：被释放学生因级联而 REJECTED(cascade) 的其他课题申请 → PENDING
    if (freedIds.length) {
      await tx.application.updateMany({
        where: {
          studentId: { in: freedIds },
          status: ApplicationStatus.REJECTED,
          rejectReason: 'cascade',
        },
        data: { status: ApplicationStatus.PENDING, rejectReason: null },
      });
    }

    const topic = await tx.topic.findUnique({ where: { id: topicId } });
    // 清空后若曾为非开放状态，恢复 OPEN 以便重新选题
    if (
      topic &&
      ([TopicStatus.CLOSED, TopicStatus.SELECTING, TopicStatus.LOCKED] as TopicStatus[]).includes(
        topic.status,
      )
    ) {
      await tx.topic.update({
        where: { id: topicId },
        data: { status: TopicStatus.OPEN },
      });
    }
    return { cleared: result.count };
  });
}

/** Fisher-Yates 洗牌。注意：使用 Math.random，毕设场景可接受。 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
