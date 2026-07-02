import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Space, Popconfirm, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { adminApi, skillApi, topicApi } from '@/api';
import type { Topic, Skill, Paginated } from '@/types';
import TopicFormModal from '@/components/TopicFormModal';
import { TopicStatusTag, SelectionModeTag } from '@/components/StatusTags';

export default function AdminTopics() {
  const { t } = useTranslation();
  const [data, setData] = useState<Paginated<Topic>>({ items: [], total: 0, page: 1, pageSize: 10 });
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Topic | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminApi.listTopics({ page, pageSize: 10 }));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    skillApi.list().then(setSkills).catch(() => undefined);
  }, []);

  const openEdit = (t_: Topic) => {
    setEditing(t_);
    setOpen(true);
  };

  const remove = async (id: number) => {
    try {
      await topicApi.remove(id);
      message.success(t('common.deleted'));
      load();
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  return (
    <div className="page-container">
      <Card title={t('adminTopics.title')} extra={<Button onClick={load}>{t('common.refresh')}</Button>}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data.items}
          pagination={{ current: data.page, pageSize: 10, total: data.total, onChange: setPage }}
          columns={[
            { title: t('adminTopics.colTitle'), dataIndex: 'title' },
            { title: t('adminTopics.colTeacher'), render: (_: unknown, r: Topic) => r.teacher?.name ?? '-' },
            {
              title: t('adminTopics.colMode'),
              dataIndex: 'selectionMode',
              render: (m: Topic['selectionMode']) => <SelectionModeTag mode={m} />,
            },
            { title: t('adminTopics.colCapacity'), dataIndex: 'capacity', width: 70 },
            {
              title: t('adminTopics.colApplied'),
              width: 80,
              render: (_: unknown, r: Topic) => r._count?.applications ?? 0,
            },
            {
              title: t('adminTopics.colAssigned'),
              width: 80,
              render: (_: unknown, r: Topic) => r._count?.assignments ?? 0,
            },
            {
              title: t('adminTopics.colStatus'),
              dataIndex: 'status',
              render: (s: Topic['status']) => <TopicStatusTag status={s} />,
            },
            {
              title: t('common.action'),
              width: 140,
              render: (_: unknown, r: Topic) => (
                <Space size="small">
                  <Button size="small" onClick={() => openEdit(r)}>
                    {t('common.edit')}
                  </Button>
                  <Popconfirm title={t('adminTopics.deleteConfirm')} onConfirm={() => remove(r.id)}>
                    <Button size="small" type="link" danger>
                      {t('common.delete')}
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <TopicFormModal open={open} topic={editing} skills={skills} onClose={() => setOpen(false)} onSaved={load} />
    </div>
  );
}
