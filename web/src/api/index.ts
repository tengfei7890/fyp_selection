import { get, post, put, patch, del } from './client';
import type {
  User,
  Topic,
  Application,
  Favorite,
  Skill,
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
};
