import { prisma } from '@/prisma';
import { NotificationType } from '@shared/enums';

// 中文兜底文案（前端主显示走 type + params 翻译）
const zhContent: Record<
  NotificationType,
  (p: Record<string, string>) => string
> = {
  [NotificationType.APPLICATION_ACCEPTED]: (p) =>
    `教师通过了你对《${p.topicTitle ?? ''}》的申请`,
  [NotificationType.APPLICATION_REJECTED]: (p) =>
    `教师拒绝了你对《${p.topicTitle ?? ''}》的申请`,
  [NotificationType.ASSIGNMENT_CREATED]: (p) =>
    `你已被确定为课题《${p.topicTitle ?? ''}》`,
  [NotificationType.ASSIGNMENT_CLEARED]: (p) =>
    `课题《${p.topicTitle ?? ''}》的选题结果已被清空，可重新选题`,
  [NotificationType.NEW_APPLICATION]: (p) =>
    `收到 ${p.studentName ?? ''} 对《${p.topicTitle ?? ''}》的新申请`,
};

/**
 * 创建一条站内通知（尽力而为：写入失败仅记日志）。
 * params 为结构化参数（如 { topicTitle, studentName }），前端按 type+params 渲染本地化文案；
 * content 字段写入一份中文兜底。
 */
export async function notify(
  userId: number,
  type: NotificationType,
  params: Record<string, string> = {},
  refType?: string,
  refId?: number,
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        params,
        content: zhContent[type](params),
        refType,
        refId,
      },
    });
  } catch (err) {
    console.error('[notify] 写入通知失败:', err);
  }
}
