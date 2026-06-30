import { prisma } from '@/prisma';
import { NotificationType } from '@shared/enums';

/**
 * 创建一条站内通知（尽力而为：写入失败仅记日志，不影响主流程）。
 * 在控制器、且在主事务提交之后调用。
 */
export async function notify(
  userId: number,
  type: NotificationType,
  content: string,
  refType?: string,
  refId?: number,
): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId, type, content, refType, refId },
    });
  } catch (err) {
    console.error('[notify] 写入通知失败:', err);
  }
}
