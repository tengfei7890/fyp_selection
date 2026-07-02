import { useEffect, useState, useCallback } from 'react';
import { Card, Button, List, Tag, Empty, Skeleton, message } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { notificationApi } from '@/api';
import type { NotificationItem } from '@/types';

export default function Notifications() {
  const { t } = useTranslation();
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
    notificationApi.markAllRead().catch(() => undefined);
  }, [load]);

  const markAll = async () => {
    try {
      await notificationApi.markAllRead();
      message.success(t('notifications.markedAll'));
      load();
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  const renderText = (n: NotificationItem) =>
    n.params
      ? t('notification.' + n.type, {
          topic: (n.params.topicTitle as string) ?? '',
          student: (n.params.studentName as string) ?? '',
        })
      : n.content;

  return (
    <div className="page-container">
      <Card
        title={t('notifications.title')}
        extra={
          <Button icon={<CheckOutlined />} onClick={markAll}>
            {t('notifications.markAll')}
          </Button>
        }
      >
        <Skeleton loading={loading && items.length === 0} active>
          <List
            dataSource={items}
            locale={{ emptyText: <Empty description={t('notifications.empty')} /> }}
            renderItem={(n) => (
              <List.Item>
                <List.Item.Meta
                  title={!n.readAt ? <Tag color="processing">{t('notifications.new')}</Tag> : null}
                  description={
                    <span>
                      <div>{renderText(n)}</div>
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
