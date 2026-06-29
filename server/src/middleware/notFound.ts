import type { RequestHandler } from 'express';
import { ApiError } from '@/utils/ApiError';

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new ApiError(404, '接口不存在'));
};
