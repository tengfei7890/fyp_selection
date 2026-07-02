import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Input, Space, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [data, setData] = useState<Paginated<AuditLogItem>>({ items: [], total: 0, page: 1, pageSize: 20 });
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
      <Card title={t('audit.title')}>
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder={t('audit.searchPlaceholder')}
            allowClear
            style={{ width: 240 }}
            onSearch={(v) => {
              setQ(v);
              setPage(1);
            }}
          />
          <Input.Search
            placeholder={t('audit.actionFilter')}
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
            showTotal: (n) => t('audit.total', { count: n }),
          }}
          columns={[
            { title: t('audit.colTime'), dataIndex: 'createdAt', width: 180, render: (tm: string) => new Date(tm).toLocaleString() },
            { title: t('audit.colActor'), render: (_: unknown, r: AuditLogItem) => r.actor?.name ?? r.actorId },
            { title: t('audit.colAction'), dataIndex: 'action', render: (a: string) => <Tag color={actionColor(a)}>{a}</Tag> },
            {
              title: t('audit.colTarget'),
              render: (_: unknown, r: AuditLogItem) => (r.targetType ? `${r.targetType}${r.targetId ? '#' + r.targetId : ''}` : '-'),
            },
            { title: t('audit.colDetail'), dataIndex: 'detail', ellipsis: true, render: (d: string) => d || '-' },
          ]}
        />
      </Card>
    </div>
  );
}
