/**
 * 种子数据：1 管理员 + 2 教师 + 5 学生 + 技能库 + 若干课题 + 部分申请/收藏。
 * 所有账号密码均为 123456。幂等（按 username/studentNo upsert），可重复执行。
 */
import { PrismaClient } from '@prisma/client';
import {
  Role,
  UserStatus,
  SelectionMode,
  TopicStatus,
  SystemPhase,
  ApplicationStatus,
} from '@shared/enums';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PASSWORD = '123456';
const passwordHash = bcrypt.hashSync(PASSWORD, 10);

async function main() {
  // 0) 系统设置单例
  await prisma.systemSetting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, isLocked: false, phase: SystemPhase.BROWSING },
  });

  // 1) 技能库
  const skillDefs = [
    { name: 'Python', category: '编程语言' },
    { name: 'Java', category: '编程语言' },
    { name: 'JavaScript', category: '编程语言' },
    { name: '机器学习', category: '人工智能' },
    { name: '深度学习', category: '人工智能' },
    { name: '自然语言处理', category: '人工智能' },
    { name: '数据分析', category: '数据科学' },
    { name: 'Web 开发', category: '软件工程' },
    { name: '数据库', category: '软件工程' },
    { name: '算法设计', category: '基础' },
  ];
  const skills: Record<string, { id: number }> = {};
  for (const s of skillDefs) {
    const skill = await prisma.skill.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    });
    skills[s.name] = skill;
  }

  // 2) 用户
  const admin = await upsertUser({
    username: 'admin',
    role: Role.ADMIN,
    name: '系统管理员',
  });
  const teacher1 = await upsertUser({
    username: 'teacher1',
    role: Role.TEACHER,
    name: '张老师',
    email: 'zhang@fyp.edu',
  });
  const teacher2 = await upsertUser({
    username: 'teacher2',
    role: Role.TEACHER,
    name: '李老师',
    email: 'li@fyp.edu',
  });

  const studentDefs: Array<{
    username: string;
    name: string;
    studentNo: string;
    major: string;
    gpa: number;
    grade: string;
    skills: string[];
  }> = [
    { username: 'student1', name: '王同学', studentNo: '2022001', major: '计算机科学与技术', gpa: 3.8, grade: '2022', skills: ['Python', '机器学习', '算法设计'] },
    { username: 'student2', name: '刘同学', studentNo: '2022002', major: '软件工程', gpa: 3.5, grade: '2022', skills: ['Java', 'Web 开发', '数据库'] },
    { username: 'student3', name: '陈同学', studentNo: '2022003', major: '计算机科学与技术', gpa: 3.9, grade: '2022', skills: ['Python', '深度学习', '自然语言处理'] },
    { username: 'student4', name: '赵同学', studentNo: '2022004', major: '人工智能', gpa: 3.6, grade: '2022', skills: ['Python', '数据分析', '机器学习'] },
    { username: 'student5', name: '孙同学', studentNo: '2022005', major: '软件工程', gpa: 3.2, grade: '2022', skills: ['JavaScript', 'Web 开发'] },
  ];
  const students: Record<string, number> = {};
  for (const s of studentDefs) {
    const user = await upsertUser({
      username: s.username,
      role: Role.STUDENT,
      name: s.name,
    });
    await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: { studentNo: s.studentNo, major: s.major, gpa: s.gpa, grade: s.grade },
      create: { userId: user.id, studentNo: s.studentNo, major: s.major, gpa: s.gpa, grade: s.grade },
    });
    // 技能（覆盖式：先删后建，保持与种子一致）
    await prisma.studentSkill.deleteMany({ where: { studentId: user.id } });
    for (const sk of s.skills) {
      await prisma.studentSkill.create({
        data: { studentId: user.id, skillId: skills[sk].id, level: '中级' },
      });
    }
    students[s.username] = user.id;
  }

  // 3) 课题
  const topicDefs: Array<{
    teacherId: number;
    title: string;
    description: string;
    gpa?: number;
    major?: string;
    capacity: number;
    mode: SelectionMode;
    status: TopicStatus;
    skills: string[];
  }> = [
    {
      teacherId: teacher1.id,
      title: '基于深度学习的图像分类系统',
      description: '使用卷积神经网络构建图像分类模型，完成数据集处理、模型训练与评估，并开发可视化推理界面。',
      gpa: 3.5,
      capacity: 2,
      mode: SelectionMode.MUTUAL,
      status: TopicStatus.OPEN,
      skills: ['Python', '深度学习', '算法设计'],
    },
    {
      teacherId: teacher1.id,
      title: '自然语言处理在文本情感分析中的应用',
      description: '研究文本情感分析方法，对比传统机器学习与预训练模型的效果，实现一个情感分析 Web 服务。',
      gpa: 3.3,
      capacity: 1,
      mode: SelectionMode.RANDOM,
      status: TopicStatus.OPEN,
      skills: ['Python', '自然语言处理', '机器学习'],
    },
    {
      teacherId: teacher2.id,
      title: '基于 React 的在线选题管理系统',
      description: '设计并实现一个支持多角色的选题管理 Web 系统，涵盖前后端开发与数据库设计。',
      capacity: 2,
      mode: SelectionMode.MUTUAL,
      status: TopicStatus.OPEN,
      skills: ['JavaScript', 'Web 开发', '数据库'],
    },
    {
      teacherId: teacher2.id,
      title: '校园二手交易数据分析平台',
      description: '采集并清洗校园交易数据，进行可视化分析，挖掘用户行为特征。',
      gpa: 3.0,
      major: '计算机科学与技术,软件工程,人工智能',
      capacity: 1,
      mode: SelectionMode.RANGE_RANDOM,
      status: TopicStatus.OPEN,
      skills: ['Python', '数据分析'],
    },
    {
      teacherId: teacher2.id,
      title: '（草稿）低资源场景下的语音识别研究',
      description: '探索低资源语音识别的迁移学习方法，暂未公开。',
      capacity: 1,
      mode: SelectionMode.DIRECT,
      status: TopicStatus.DRAFT,
      skills: ['Python'],
    },
  ];

  const topics: number[] = [];
  for (const t of topicDefs) {
    const created = await prisma.topic.create({
      data: {
        teacherId: t.teacherId,
        title: t.title,
        description: t.description,
        gpaThreshold: t.gpa ?? null,
        majorRestriction: t.major ?? null,
        capacity: t.capacity,
        selectionMode: t.mode,
        status: t.status,
        academicYear: '2025-2026',
        requirements: {
          create: t.skills.map((name) => ({ skillId: skills[name].id })),
        },
      },
    });
    topics.push(created.id);
  }

  // 4) 部分申请与收藏（仅前 3 个开放课题）
  await prisma.application.createMany({
    data: [
      { studentId: students['student1'], topicId: topics[0], status: ApplicationStatus.PENDING, message: '我对深度学习很感兴趣，做过相关课程项目。' },
      { studentId: students['student3'], topicId: topics[0], status: ApplicationStatus.PENDING, message: '希望能在图像分类方向深入研究。' },
      { studentId: students['student4'], topicId: topics[1], status: ApplicationStatus.PENDING, message: '有 NLP 课程基础。' },
      { studentId: students['student2'], topicId: topics[2], status: ApplicationStatus.PENDING, message: '熟悉 React 全栈开发。' },
    ],
    skipDuplicates: true,
  });
  await prisma.favorite.createMany({
    data: [
      { studentId: students['student1'], topicId: topics[1] },
      { studentId: students['student3'], topicId: topics[0] },
      { studentId: students['student5'], topicId: topics[2] },
    ],
    skipDuplicates: true,
  });

  console.log('✅ 种子数据写入完成');
  console.log(`   技能 ${Object.keys(skills).length} 个 | 课题 ${topics.length} 个 | 学生 ${studentDefs.length} 个`);
  console.log('   账号：admin / teacher1 / teacher2 / student1..5，密码均为 123456');
}

async function upsertUser(args: {
  username: string;
  role: Role;
  name: string;
  email?: string;
}) {
  return prisma.user.upsert({
    where: { username: args.username },
    update: {},
    create: {
      username: args.username,
      passwordHash,
      role: args.role,
      name: args.name,
      email: args.email ?? null,
      status: UserStatus.ACTIVE,
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ 种子数据写入失败：', e);
    await prisma.$disconnect();
    process.exit(1);
  });
