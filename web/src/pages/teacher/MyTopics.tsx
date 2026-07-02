import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Space, Popconfirm, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { topicApi, skillApi } from '@/api';
import type { Topic, Skill, Paginated } from '@/types';
import TopicFormModal from '@/components/TopicFormModal';
import { TopicStatusTag, SelectionModeTag } from '@/components/StatusTags';
import { TopicStatus } from '@shared/enums';

export default function MyTopics() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<Paginated<Topic>>({ items: [], total: 0, page: 1, pageSize: 10 });
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Topic | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await topicApi.list({ page, pageSize: 10 }));
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

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (tp: Topic) => {
    setEditing(tp);
    setOpen(true);
  };

  const changeStatus = async (tp: Topic, status: TopicStatus) => {
    try {
      await topicApi.updateStatus(tp.id, status);
      message.success(t('common.updated'));
      load();
    } catch (err) {
      message.error((err as Error).message);
    }
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
      <Card
        title={t('myTopics.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('myTopics.create')}
          </Button>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data.items}
          pagination={{ current: data.page, pageSize: 10, total: data.total, onChange: setPage }}
          columns={[
            { title: t('myTopics.colTitle'), dataIndex: 'title' },
            {
              title: t('myTopics.colMode'),
              dataIndex: 'selectionMode',
              width: 110,
              render: (m: Topic['selectionMode']) => <SelectionModeTag mode={m} />,
            },
            { title: t('myTopics.colCapacity'), dataIndex: 'capacity', width: 70 },
            {
              title: t('myTopics.colApplied'),
              width: 70,
              render: (_: unknown, r: Topic) => r._count?.applications ?? 0,
            },
            {
              title: t('myTopics.colStatus'),
              dataIndex: 'status',
              width: 110,
              render: (s: Topic['status']) => <TopicStatusTag status={s} />,
            },
            {
              title: t('common.action'),
              width: 300,
              render: (_: unknown, r: Topic) => (
                <Space size="small" wrap>
                  <Button size="small" onClick={() => openEdit(r)}>{t('common.edit')}</Button>
                  <Button size="small" type="link" onClick={() => navigate(`/teacher/applications?topicId=${r.id}`)}>
                    {t('myTopics.viewApps')}
                  </Button>
                  {r.status === TopicStatus.DRAFT && (
                    <Button size="small" type="link" onClick={() => changeStatus(r, TopicStatus.OPEN)}>{t('myTopics.publish')}</Button>
                  )}
                  {r.status === TopicStatus.OPEN && (
                    <Button size="small" type="link" danger onClick={() => changeStatus(r, TopicStatus.CLOSED)}>{t('myTopics.unpublish')}</Button>
                  )}
                  <Popconfirm title={t('myTopics.deleteConfirm')} onConfirm={() => remove(r.id)}>
                    <Button size="small" type="link" danger>{t('common.delete')}</Button>
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
