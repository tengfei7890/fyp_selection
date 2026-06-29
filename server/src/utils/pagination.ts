import type { Request } from 'express';

export interface Pagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

/** 从 query 解析分页参数，带边界保护。 */
export function paginate(req: Request): Pagination {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(req.query.pageSize as string, 10) || 10),
  );
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
