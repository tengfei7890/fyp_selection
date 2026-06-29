import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Popconfirm, message, Tag, Alert, Descriptions } from 'antd';
import { Link } from 'react-router-dom';
import { applicationApi } from '@/api';
import type { Application, Assignment } from '@/types';
import { ApplicationStatusTag, SelectionModeTag } from '@/components/StatusTags';
import { ApplicationStatus } from '@shared/enums';

export default function MyApplications() {
  const [items, setItems] = useState<Application[]>([]);
  const [result, setResult] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [apps, res] = await Promise.all([
        applicationApi.mine(),
        applicationApi.myResult(),
      ]);
      setItems(apps);
      setResult(res);
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
      {result ? (
        <Card style={{ marginBottom: 16 }}>
          <Alert
            type="success"
            showIcon
            message={`你的毕业设计课题已确定：${result.topic?.title ?? ''}`}
            style={{ marginBottom: 12 }}
          />
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="课题">{result.topic?.title}</Descriptions.Item>
            <Descriptions.Item label="指导教师">
              {result.topic?.teacher?.name ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="确定方式">
              <SelectionModeTag mode={result.method} />
            </Descriptions.Item>
            <Descriptions.Item label="确定时间">
              {new Date(result.createdAt).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      ) : (
        <Alert
          type="info"
          showIcon
          message="你目前还没有被确定课题。"
          description="请积极申请感兴趣的课题，等待教师确认或系统选题。"
          style={{ marginBottom: 16 }}
        />
      )}

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
              render: (_: unknown, r: Application) => {
                if (r.status === ApplicationStatus.REJECTED) {
                  if (r.rejectReason === 'cascade') {
                    return (
                      <Tag
                        color="orange"
                        title={result?.topic?.title ? `你已确定：${result.topic.title}` : undefined}
                      >
                        已选其他课题
                      </Tag>
                    );
                  }
                  return <Tag color="red">教师拒绝</Tag>;
                }
                return <ApplicationStatusTag status={r.status} />;
              },
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
