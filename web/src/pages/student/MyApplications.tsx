import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Popconfirm, message, Tag, Alert, Descriptions } from 'antd';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { applicationApi } from '@/api';
import type { Application, Assignment } from '@/types';
import { ApplicationStatusTag, SelectionModeTag } from '@/components/StatusTags';
import { ApplicationStatus } from '@shared/enums';

export default function MyApplications() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Application[]>([]);
  const [result, setResult] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [apps, res] = await Promise.all([applicationApi.mine(), applicationApi.myResult()]);
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
      message.success(t('common.success'));
      load();
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  return (
    <div className="page-container">
      {result ? (
        <Card style={{ marginBottom: 16 }}>
          <Alert type="success" showIcon message={t('myApplications.resultTitle', { title: result.topic?.title ?? '' })} style={{ marginBottom: 12 }} />
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label={t('myApplications.resultTopic')}>{result.topic?.title}</Descriptions.Item>
            <Descriptions.Item label={t('myApplications.resultTeacher')}>{result.topic?.teacher?.name ?? '-'}</Descriptions.Item>
            <Descriptions.Item label={t('myApplications.resultMethod')}><SelectionModeTag mode={result.method} /></Descriptions.Item>
            <Descriptions.Item label={t('myApplications.resultTime')}>{new Date(result.createdAt).toLocaleString()}</Descriptions.Item>
          </Descriptions>
        </Card>
      ) : (
        <Alert
          type="info"
          showIcon
          message={t('myApplications.noResult')}
          description={t('myApplications.noResultDesc')}
          style={{ marginBottom: 16 }}
        />
      )}

      <Card title={t('myApplications.title')} extra={<Button onClick={load}>{t('common.refresh')}</Button>}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: t('myApplications.colTitle'),
              render: (_: unknown, r: Application) => <Link to={`/student/topics/${r.topicId}`}>{r.topic?.title}</Link>,
            },
            { title: t('myApplications.colTeacher'), render: (_: unknown, r: Application) => r.topic?.teacher?.name },
            { title: t('myApplications.colMessage'), dataIndex: 'message', ellipsis: true, render: (m: string) => m || '-' },
            { title: t('myApplications.colTime'), dataIndex: 'createdAt', render: (tm: string) => new Date(tm).toLocaleString() },
            {
              title: t('myApplications.colStatus'),
              render: (_: unknown, r: Application) => {
                if (r.status === ApplicationStatus.REJECTED) {
                  if (r.rejectReason === 'cascade') {
                    return (
                      <Tag color="orange" title={result?.topic?.title ? t('messages.youConfirmed', { title: result.topic.title }) : undefined}>
                        {t('appRejectReason.cascade')}
                      </Tag>
                    );
                  }
                  return <Tag color="red">{t('appRejectReason.manual')}</Tag>;
                }
                return <ApplicationStatusTag status={r.status} />;
              },
            },
            {
              title: t('common.action'),
              render: (_: unknown, r: Application) =>
                r.status === ApplicationStatus.PENDING ? (
                  <Popconfirm title={t('myApplications.withdrawConfirm')} onConfirm={() => withdraw(r.id)}>
                    <Button type="link" danger size="small">{t('myApplications.withdraw')}</Button>
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
