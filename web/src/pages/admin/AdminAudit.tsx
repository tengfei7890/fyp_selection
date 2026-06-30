import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Input, Space, Tag } from 'antd';
import { adminApi } from '@/api';
import type { AuditLogItem, Paginated } from '@/types';

function actionColor(action: string): string {
  if (action.includes('delete')) return 'red';
  if (action.includes('create')) return 'green';
  if (action.includes('lock') || action.includes('settings')) return 'orange';
  if (action.startsWith('selection')) return 'blue';
  return 'default';
}

export default function AdminAudit() {
  const [data, setData] = useState<Paginated<AuditLogItem>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminApi.audit.list({ page, pageSize, q, action }));
    } finally {
      setLoading(false);
    }
  }, [page, q, action]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page-container">
      <Card title="审计日志">
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="搜索动作 / 详情"
            allowClear
            style={{ width: 240 }}
            onSearch={(v) => {
              setQ(v);
              setPage(1);
            }}
          />
          <Input.Search
            placeholder="按动作前缀筛选（如 selection / user）"
            allowClear
            style={{ width: 240 }}
            onSearch={(v) => {
              setAction(v);
              setPage(1);
            }}
          />
        </Space>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data.items}
          pagination={{
            current: data.page,
            pageSize,
            total: data.total,
            onChange: setPage,
            showTotal: (t) => `共 ${t} 条`,
          }}
          columns={[
            {
              title: '时间',
              dataIndex: 'createdAt',
              width: 180,
              render: (t: string) => new Date(t).toLocaleString(),
            },
            {
              title: '操作人',
              render: (_: unknown, r: AuditLogItem) => r.actor?.name ?? r.actorId,
            },
            {
              title: '动作',
              dataIndex: 'action',
              render: (a: string) => <Tag color={actionColor(a)}>{a}</Tag>,
            },
            {
              title: '对象',
              render: (_: unknown, r: AuditLogItem) =>
                r.targetType ? `${r.targetType}${r.targetId ? '#' + r.targetId : ''}` : '-',
            },
            {
              title: '详情',
              dataIndex: 'detail',
              ellipsis: true,
              render: (d: string) => d || '-',
            },
          ]}
        />
      </Card>
    </div>
  );
}
