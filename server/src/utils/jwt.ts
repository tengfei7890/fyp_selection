import jwt from 'jsonwebtoken';
import { env } from '@/config';
import type { Role } from '@shared/enums';

export interface JwtPayload {
  userId: number;
  role: Role;
  username: string;
  name: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}
