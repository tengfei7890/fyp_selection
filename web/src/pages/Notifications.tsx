import { useEffect, useState, useCallback } from 'react';
import { Card, Button, List, Tag, Empty, Skeleton, message } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { notificationApi } from '@/api';
import type { NotificationItem } from '@/types';
import { NotificationTypeLabels, NotificationType } from '@shared/enums';

const typeColor: Record<NotificationType, string> = {
  [NotificationType.APPLICATION_ACCEPTED]: 'green',
  [NotificationType.APPLICATION_REJECTED]: 'red',
  [NotificationType.ASSIGNMENT_CREATED]: 'blue',
  [NotificationType.ASSIGNMENT_CLEARED]: 'orange',
  [NotificationType.NEW_APPLICATION]: 'purple',
};

export default function Notifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await notificationApi.list());
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // 打开通知页即在后台标记全部已读（下次轮询徽标清零）
    notificationApi.markAllRead().catch(() => undefined);
  }, [load]);

  const markAll = async () => {
    try {
      await notificationApi.markAllRead();
      message.success('已全部标记为已读');
      load();
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  return (
    <div className="page-container">
      <Card
        title="通知"
        extra={
          <Button icon={<CheckOutlined />} onClick={markAll}>
            全部已读
          </Button>
        }
      >
        <Skeleton loading={loading && items.length === 0} active>
          <List
            dataSource={items}
            locale={{ emptyText: <Empty description="暂无通知" /> }}
            renderItem={(n) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <span>
                      <Tag color={typeColor[n.type]}>{NotificationTypeLabels[n.type]}</Tag>
                      {!n.readAt && <Tag color="processing">新</Tag>}
                    </span>
                  }
                  description={
                    <span>
                      <div>{n.content}</div>
                      <span style={{ color: '#999', fontSize: 12 }}>
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        </Skeleton>
      </Card>
    </div>
  );
}
