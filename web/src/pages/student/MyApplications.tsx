import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Popconfirm, message, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { applicationApi } from '@/api';
import type { Application } from '@/types';
import { ApplicationStatusTag } from '@/components/StatusTags';
import { ApplicationStatus } from '@shared/enums';

export default function MyApplications() {
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await applicationApi.mine());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const withdraw = async (id: number) => {
    try {
      await applicationApi.withdraw(id);
      message.success('已撤回申请');
      load();
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  return (
    <div className="page-container">
      <Card title="我的申请" extra={<Button onClick={load}>刷新</Button>}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: '课题标题',
              render: (_: unknown, r: Application) => (
                <Link to={`/student/topics/${r.topicId}`}>{r.topic?.title}</Link>
              ),
            },
            { title: '指导教师', render: (_: unknown, r: Application) => r.topic?.teacher?.name },
            { title: '我的留言', dataIndex: 'message', ellipsis: true, render: (m: string) => m || '-' },
            { title: '申请时间', dataIndex: 'createdAt', render: (t: string) => new Date(t).toLocaleString() },
            {
              title: '状态',
              dataIndex: 'status',
              render: (s: Application['status']) => <ApplicationStatusTag status={s} />,
            },
            {
              title: '操作',
              render: (_: unknown, r: Application) =>
                r.status === ApplicationStatus.PENDING ? (
                  <Popconfirm title="确定撤回该申请？" onConfirm={() => withdraw(r.id)}>
                    <Button type="link" danger size="small">
                      撤回
                    </Button>
                  </Popconfirm>
                ) : (
                  <Tag>—</Tag>
                ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
