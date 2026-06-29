import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Space, Popconfirm, message } from 'antd';
import { adminApi, skillApi, topicApi } from '@/api';
import type { Topic, Skill, Paginated } from '@/types';
import TopicFormModal from '@/components/TopicFormModal';
import { TopicStatusTag, SelectionModeTag } from '@/components/StatusTags';

export default function AdminTopics() {
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

  const openEdit = (t: Topic) => {
    setEditing(t);
    setOpen(true);
  };

  const remove = async (id: number) => {
    try {
      // 复用 topics 删除接口（后端已放行 ADMIN）
      await topicApi.remove(id);
      message.success('课题已删除');
      load();
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  return (
    <div className="page-container">
      <Card
        title="课题总览"
        extra={<Button onClick={load}>刷新</Button>}
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data.items}
          pagination={{
            current: data.page,
            pageSize: 10,
            total: data.total,
            onChange: setPage,
          }}
          columns={[
            { title: '课题标题', dataIndex: 'title' },
            { title: '指导教师', render: (_: unknown, r: Topic) => r.teacher?.name ?? '-' },
            {
              title: '选题模式',
              dataIndex: 'selectionMode',
              render: (m: Topic['selectionMode']) => <SelectionModeTag mode={m} />,
            },
            { title: '容量', dataIndex: 'capacity', width: 70 },
            {
              title: '申请数',
              width: 80,
              render: (_: unknown, r: Topic) => r._count?.applications ?? 0,
            },
            {
              title: '已分配',
              width: 80,
              render: (_: unknown, r: Topic) => r._count?.assignments ?? 0,
            },
            {
              title: '状态',
              dataIndex: 'status',
              render: (s: Topic['status']) => <TopicStatusTag status={s} />,
            },
            {
              title: '操作',
              width: 140,
              render: (_: unknown, r: Topic) => (
                <Space size="small">
                  <Button size="small" onClick={() => openEdit(r)}>
                    编辑
                  </Button>
                  <Popconfirm title="确定删除该课题？" onConfirm={() => remove(r.id)}>
                    <Button size="small" type="link" danger>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <TopicFormModal
        open={open}
        topic={editing}
        skills={skills}
        onClose={() => setOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
