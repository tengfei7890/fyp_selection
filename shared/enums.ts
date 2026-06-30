/**
 * 跨端共享枚举（前后端共用，避免定义漂移）。
 *
 * 采用 `const 对象 + 同名 type` 的写法，与 Prisma 生成的枚举在结构上完全一致，
 * 因此可直接传给 Prisma 查询（如 `where: { role: Role.STUDENT }`）而不产生类型冲突。
 */

export const Role = {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

/** 选题模式：四种模式最终都产出 Assignment 记录 */
export const SelectionMode = {
  /** 教师直接指定学生 */
  DIRECT: 'DIRECT',
  /** 双向互选：学生申请，教师逐条接受/拒绝 */
  MUTUAL: 'MUTUAL',
  /** 随机选择：从合格申请人中随机抽取 */
  RANDOM: 'RANDOM',
  /** 教师指定范围（GPA/专业/候选人）后在范围内随机 */
  RANGE_RANDOM: 'RANGE_RANDOM',
} as const;
export type SelectionMode = (typeof SelectionMode)[keyof typeof SelectionMode];

export const TopicStatus = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  SELECTING: 'SELECTING',
  CLOSED: 'CLOSED',
  LOCKED: 'LOCKED',
} as const;
export type TopicStatus = (typeof TopicStatus)[keyof typeof TopicStatus];

export const ApplicationStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;
export type ApplicationStatus =
  (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

/** 系统阶段（管理员维护） */
export const SystemPhase = {
  REGISTRATION: 'REGISTRATION',
  BROWSING: 'BROWSING',
  SELECTION: 'SELECTION',
  LOCKED: 'LOCKED',
} as const;
export type SystemPhase = (typeof SystemPhase)[keyof typeof SystemPhase];

/* ----------------------------- 展示用标签 ----------------------------- */

export const RoleLabels: Record<Role, string> = {
  [Role.ADMIN]: '管理员',
  [Role.TEACHER]: '教师',
  [Role.STUDENT]: '学生',
};

export const SelectionModeLabels: Record<SelectionMode, string> = {
  [SelectionMode.DIRECT]: '教师指定',
  [SelectionMode.MUTUAL]: '双向互选',
  [SelectionMode.RANDOM]: '随机选择',
  [SelectionMode.RANGE_RANDOM]: '范围随机',
};

export const TopicStatusLabels: Record<TopicStatus, string> = {
  [TopicStatus.DRAFT]: '草稿',
  [TopicStatus.OPEN]: '开放中',
  [TopicStatus.SELECTING]: '选题中',
  [TopicStatus.CLOSED]: '已关闭',
  [TopicStatus.LOCKED]: '已锁定',
};

export const ApplicationStatusLabels: Record<ApplicationStatus, string> = {
  [ApplicationStatus.PENDING]: '待处理',
  [ApplicationStatus.ACCEPTED]: '已通过',
  [ApplicationStatus.REJECTED]: '已拒绝',
  [ApplicationStatus.WITHDRAWN]: '已撤回',
};

export const SystemPhaseLabels: Record<SystemPhase, string> = {
  [SystemPhase.REGISTRATION]: '信息登记',
  [SystemPhase.BROWSING]: '课题浏览',
  [SystemPhase.SELECTION]: '选题进行',
  [SystemPhase.LOCKED]: '已锁定',
};

/* ----------------------------- 通知 ----------------------------- */

export const NotificationType = {
  APPLICATION_ACCEPTED: 'APPLICATION_ACCEPTED',
  APPLICATION_REJECTED: 'APPLICATION_REJECTED',
  ASSIGNMENT_CREATED: 'ASSIGNMENT_CREATED',
  ASSIGNMENT_CLEARED: 'ASSIGNMENT_CLEARED',
  NEW_APPLICATION: 'NEW_APPLICATION',
} as const;
export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationTypeLabels: Record<NotificationType, string> = {
  [NotificationType.APPLICATION_ACCEPTED]: '申请通过',
  [NotificationType.APPLICATION_REJECTED]: '申请拒绝',
  [NotificationType.ASSIGNMENT_CREATED]: '选题确定',
  [NotificationType.ASSIGNMENT_CLEARED]: '选题清空',
  [NotificationType.NEW_APPLICATION]: '新申请',
};
