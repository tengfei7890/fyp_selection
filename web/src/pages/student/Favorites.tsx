import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Space, Popconfirm, message } from 'antd';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { favoriteApi } from '@/api';
import type { Favorite } from '@/types';
import { SelectionModeTag } from '@/components/StatusTags';

export default function Favorites() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await favoriteApi.mine());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (topicId: number) => {
    try {
      await favoriteApi.remove(topicId);
      setItems((prev) => prev.filter((f) => f.topicId !== topicId));
      message.success(t('common.removed'));
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  return (
    <div className="page-container">
      <Card title={t('favorites.title')} extra={<Button onClick={load}>{t('common.refresh')}</Button>}>
        <Table
          rowKey="topicId"
          loading={loading}
          dataSource={items}
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: t('favorites.colTitle'),
              render: (_: unknown, r: Favorite) => (
                <Link to={`/student/topics/${r.topicId}`}>{r.topic.title}</Link>
              ),
            },
            { title: t('favorites.colTeacher'), render: (_: unknown, r: Favorite) => r.topic.teacher?.name },
            {
              title: t('favorites.colMode'),
              dataIndex: ['topic', 'selectionMode'],
              render: (m: Favorite['topic']['selectionMode']) => <SelectionModeTag mode={m} />,
            },
            { title: t('favorites.colTime'), dataIndex: 'createdAt', render: (tm: string) => new Date(tm).toLocaleString() },
            {
              title: t('common.action'),
              render: (_: unknown, r: Favorite) => (
                <Space>
                  <Link to={`/student/topics/${r.topicId}`}>{t('common.view')}</Link>
                  <Popconfirm title={t('favorites.removeConfirm')} onConfirm={() => remove(r.topicId)}>
                    <Button type="link" danger size="small">
                      {t('favorites.remove')}
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
