import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { ApiError } from '@/utils/ApiError';

/** 用 Zod schema 校验 req.body，通过后用解析结果替换 req.body。 */
export const validateBody =
  (schema: ZodTypeAny): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        new ApiError(400, '请求参数校验失败', result.error.flatten()),
      );
    }
    req.body = result.data;
    next();
  };
