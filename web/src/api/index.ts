import { get, post, put, patch, del } from './client';
import type {
  User,
  Topic,
  Application,
  Assignment,
  Favorite,
  Skill,
  StudentSearchItem,
  SystemSettings,
  AdminStats,
  Paginated,
} from '@/types';
import type { SelectionMode, TopicStatus } from '@shared/enums';

export interface TopicInput {
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

export interface RangeCriteria {
  gpaMin?: number | null;
  majors?: string[];
  candidateStudentIds?: number[];
}

export interface ProfileInput {
  studentNo: string;
  major: string;
  gpa?: number | null;
  grade?: string | null;
  bio?: string | null;
  skillIds?: number[];
}

export interface ListParams {
  q?: string;
  page?: number;
  pageSize?: number;
  status?: string;
  role?: string;
  skillId?: number;
  major?: string;
}

/* ------------------------------- Auth ------------------------------- */
export const authApi = {
  login: (username: string, password: string) =>
    post<{ token: string; user: User }>('/auth/login', { username, password }),
  me: () => get<User>('/auth/me'),
};

/* ------------------------------ Topics ----------------------------- */
export const topicApi = {
  list: (params: ListParams) => get<Paginated<Topic>>('/topics', params),
  get: (id: number) => get<Topic>(`/topics/${id}`),
  create: (data: TopicInput) => post<Topic>('/topics', data),
  update: (id: number, data: TopicInput) => put<Topic>(`/topics/${id}`, data),
  updateStatus: (id: number, status: TopicStatus) =>
    patch<Topic>(`/topics/${id}/status`, { status }),
  remove: (id: number) => del<{ success: boolean }>(`/topics/${id}`),
  // 选题执行
  select: (id: number, criteria?: RangeCriteria) =>
    post<{ assigned: number; totalAssigned?: number }>(`/topics/${id}/select`, {
      criteria,
    }),
  assignDirect: (id: number, studentIds: number[]) =>
    post<{ assigned: number; skipped: number }>(`/topics/${id}/assign-direct`, {
      studentIds,
    }),
  clearAssignments: (id: number) =>
    del<{ cleared: number }>(`/topics/${id}/assignments`),
  assignments: (id: number) =>
    get<Assignment[]>(`/topics/${id}/assignments`),
};

/* ------------------------------ Skills ----------------------------- */
export const skillApi = {
  list: () => get<Skill[]>('/skills'),
  create: (name: string, category?: string) =>
    post<Skill>('/skills', { name, category }),
};

/* -------------------------- Applications --------------------------- */
export const applicationApi = {
  create: (topicId: number, message?: string) =>
    post<Application>('/applications', { topicId, message }),
  mine: () => get<Application[]>('/applications/mine'),
  byTopic: (topicId: number) =>
    get<Application[]>('/applications', { topicId }),
  withdraw: (id: number) => patch<Application>(`/applications/${id}/withdraw`),
  accept: (id: number) => post<{ success: boolean }>(`/applications/${id}/accept`),
  reject: (id: number) => post<{ success: boolean }>(`/applications/${id}/reject`),
  myResult: () => get<Assignment | null>('/applications/my-result'),
};

/* ----------------------------- Favorites --------------------------- */
export const favoriteApi = {
  mine: () => get<Favorite[]>('/favorites/mine'),
  create: (topicId: number) =>
    post<{ success: boolean }>('/favorites', { topicId }),
  remove: (topicId: number) =>
    del<{ success: boolean }>(`/favorites/${topicId}`),
};

/* ------------------------------- Users ----------------------------- */
export const userApi = {
  updateProfile: (data: ProfileInput) => put<User>('/users/profile', data),
  get: (id: number) => get<User>(`/users/${id}`),
  searchStudents: (q?: string) =>
    get<StudentSearchItem[]>('/users/students', { q }),
};

/* ------------------------------- Admin ----------------------------- */
export const adminApi = {
  stats: () => get<AdminStats>('/admin/stats'),
  listUsers: (params: ListParams) => get<Paginated<User>>('/admin/users', params),
  createUser: (data: Record<string, unknown>) =>
    post<User>('/admin/users', data),
  updateUser: (id: number, data: Record<string, unknown>) =>
    put<User>(`/admin/users/${id}`, data),
  deleteUser: (id: number) => del<{ success: boolean }>(`/admin/users/${id}`),
  listTopics: (params: ListParams) =>
    get<Paginated<Topic>>('/admin/topics', params),
  getSettings: () => get<SystemSettings>('/admin/settings'),
  updateSettings: (data: { isLocked?: boolean; phase?: string }) =>
    put<SystemSettings>('/admin/settings', data),
  // 选题结果管理
  assignments: {
    list: (params: ListParams) =>
      get<Paginated<Assignment>>('/admin/assignments', params),
    create: (data: {
      studentId: number;
      topicId: number;
      method?: string;
      note?: string;
    }) => post<Assignment>('/admin/assignments', data),
    update: (id: number, data: { topicId?: number; note?: string | null }) =>
      put<Assignment>(`/admin/assignments/${id}`, data),
    remove: (id: number) => del<{ success: boolean }>(`/admin/assignments/${id}`),
  },
};
