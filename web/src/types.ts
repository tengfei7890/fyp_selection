import type {
  Role,
  SelectionMode,
  TopicStatus,
  ApplicationStatus,
  UserStatus,
  SystemPhase,
} from '@shared/enums';

export interface Skill {
  id: number;
  name: string;
  category?: string | null;
}

export interface StudentSkill {
  skillId: number;
  studentId: number;
  level?: string | null;
  skill: Skill;
}

export interface StudentProfile {
  userId: number;
  studentNo: string;
  major: string;
  gpa?: number | null;
  grade?: string | null;
  bio?: string | null;
  skills: StudentSkill[];
}

export interface User {
  id: number;
  username: string;
  role: Role;
  name: string;
  email?: string | null;
  phone?: string | null;
  status?: UserStatus;
  studentProfile?: StudentProfile | null;
}

export interface Topic {
  id: number;
  teacherId: number;
  title: string;
  description: string;
  gpaThreshold?: number | null;
  majorRestriction?: string | null;
  capacity: number;
  selectionMode: SelectionMode;
  status: TopicStatus;
  academicYear?: string | null;
  createdAt?: string;
  updatedAt?: string;
  teacher?: { id: number; name: string; username?: string };
  requirements?: { skill: Skill }[];
  _count?: { applications: number; favorites: number; assignments: number };
}

export interface Application {
  id: number;
  studentId: number;
  topicId: number;
  status: ApplicationStatus;
  message?: string | null;
  createdAt: string;
  updatedAt?: string;
  topic?: Topic;
  student?: User;
}

export interface Favorite {
  studentId: number;
  topicId: number;
  createdAt: string;
  topic: Topic;
}

/** 最终选题结果（定稿） */
export interface Assignment {
  id: number;
  studentId: number;
  topicId: number;
  method: SelectionMode;
  assignedBy: number;
  locked: boolean;
  note?: string | null;
  createdAt: string;
  student?: { id: number; name: string; username: string };
  topic?: { id: number; title: string; teacher?: { name: string } };
}

/** 学生搜索结果项（直接指定 / 改派用） */
export interface StudentSearchItem {
  id: number;
  name: string;
  username: string;
  studentProfile?: {
    studentNo: string;
    major: string;
    gpa?: number | null;
  } | null;
}

export interface SystemSettings {
  id: number;
  isLocked: boolean;
  phase: SystemPhase;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminStats {
  users: number;
  topics: number;
  applications: number;
  assignments: number;
  openTopics: number;
  students: number;
  unassignedStudents: number;
}
