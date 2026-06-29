import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Popconfirm,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { topicApi, skillApi } from '@/api';
import type { Topic, Skill, Paginated } from '@/types';
import TopicFormModal from '@/components/TopicFormModal';
import { TopicStatusTag, SelectionModeTag } from '@/components/StatusTags';
import { TopicStatus } from '@shared/enums';

export default function MyTopics() {
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

  const openEdit = (t: Topic) => {
    setEditing(t);
    setOpen(true);
  };

  const changeStatus = async (t: Topic, status: TopicStatus) => {
    try {
      await topicApi.updateStatus(t.id, status);
      message.success('状态已更新');
      load();
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  const remove = async (id: number) => {
    try {
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
        title="我的课题"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建课题
          </Button>
        }
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
            {
              title: '选题模式',
              dataIndex: 'selectionMode',
              width: 110,
              render: (m: Topic['selectionMode']) => <SelectionModeTag mode={m} />,
            },
            { title: '容量', dataIndex: 'capacity', width: 70 },
            {
              title: '申请',
              width: 70,
              render: (_: unknown, r: Topic) => r._count?.applications ?? 0,
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 110,
              render: (s: Topic['status']) => <TopicStatusTag status={s} />,
            },
            {
              title: '操作',
              width: 300,
              render: (_: unknown, r: Topic) => (
                <Space size="small" wrap>
                  <Button size="small" onClick={() => openEdit(r)}>
                    编辑
                  </Button>
                  <Button
                    size="small"
                    type="link"
                    onClick={() => navigate(`/teacher/applications?topicId=${r.id}`)}
                  >
                    查看申请
                  </Button>
                  {r.status === TopicStatus.DRAFT && (
                    <Button size="small" type="link" onClick={() => changeStatus(r, TopicStatus.OPEN)}>
                      上架
                    </Button>
                  )}
                  {r.status === TopicStatus.OPEN && (
                    <Button size="small" type="link" danger onClick={() => changeStatus(r, TopicStatus.CLOSED)}>
                      下架
                    </Button>
                  )}
                  <Popconfirm title="删除课题将同时清除其申请与收藏，确定？" onConfirm={() => remove(r.id)}>
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
