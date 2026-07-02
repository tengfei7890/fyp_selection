import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '@/utils/ApiError';

/** 统一错误处理中间件（必须是 4 个参数才能被 Express 识别）。 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[] | undefined)?.join(', ');
        return res
          .status(409)
          .json({ error: `唯一约束冲突：${target ?? '字段'}已存在` });
      }
      case 'P2025':
        return res.status(404).json({ error: '资源不存在' });
      case 'P2003':
        return res.status(400).json({ error: '关联资源不存在（外键约束）' });
      default:
        return res.status(400).json({ error: `数据库错误：${err.code}` });
    }
  }

  console.error('[未处理错误]', err);
  return res.status(500).json({ error: '服务器内部错误' });
};
