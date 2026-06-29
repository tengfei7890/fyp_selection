import type { Role } from '@shared/enums';

export interface AuthUser {
  id: number;
  role: Role;
  username: string;
  name: string;
}

// 给 Express 的 Request 增加 user 字段（鉴权后挂载）
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}
