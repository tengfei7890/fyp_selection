import { prisma } from '@/prisma';

/**
 * 记录审计日志（尽力而为：写入失败仅记日志，不影响主流程）。
 * 在控制器、且在主操作成功之后调用。
 */
export async function audit(
  actorId: number,
  action: string,
  targetType?: string,
  targetId?: number,
  detail?: string,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { actorId, action, targetType, targetId, detail },
    });
  } catch (err) {
    console.error('[audit] 写入审计失败:', err);
  }
}
