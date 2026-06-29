import axios from 'axios';
import { message } from 'antd';

/**
 * 统一的 axios 实例：自动携带 JWT；响应拦截器解包为 data；
 * 401 时清理登录态并跳转登录页。
 */
const instance = axios.create({ baseURL: '/api', timeout: 15000 });

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('fyp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

instance.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err.response?.status;
    const msg = err.response?.data?.error || err.message || '请求失败';
    if (status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('fyp_token');
      localStorage.removeItem('fyp_user');
      message.error('登录已过期，请重新登录');
      window.location.href = '/login';
    }
    return Promise.reject(new Error(msg));
  },
);

/** 带类型的请求辅助函数（拦截器已解包，直接返回业务数据） */
export async function get<T>(url: string, params?: object): Promise<T> {
  return (await instance.get(url, { params })) as unknown as T;
}
export async function post<T>(url: string, body?: unknown): Promise<T> {
  return (await instance.post(url, body)) as unknown as T;
}
export async function put<T>(url: string, body?: unknown): Promise<T> {
  return (await instance.put(url, body)) as unknown as T;
}
export async function patch<T>(url: string, body?: unknown): Promise<T> {
  return (await instance.patch(url, body)) as unknown as T;
}
export async function del<T>(url: string): Promise<T> {
  return (await instance.delete(url)) as unknown as T;
}
