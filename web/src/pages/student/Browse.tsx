import { useEffect, useState, useCallback } from 'react';
import { Table, Input, Card, Space, Button, Select, Switch, Tooltip } from 'antd';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { topicApi, skillApi } from '@/api';
import type { Topic, Skill, Paginated } from '@/types';
import { TopicStatusTag, SelectionModeTag } from '@/components/StatusTags';

export default function Browse() {
  const { t } = useTranslation();
  const [data, setData] = useState<Paginated<Topic>>({ items: [], total: 0, page: 1, pageSize: 10 });
  const [skills, setSkills] = useState<Skill[]>([]);
  const [q, setQ] = useState('');
  const [skillId, setSkillId] = useState<number | undefined>();
  const [major, setMajor] = useState('');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await topicApi.list({ q, skillId, major, eligibleOnly, page, pageSize });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [q, skillId, major, eligibleOnly, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    skillApi.list().then(setSkills).catch(() => undefined);
  }, []);

  return (
    <div className="page-container">
      <Card title={t('browse.title')} extra={<Button onClick={load}>{t('common.refresh')}</Button>}>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder={t('browse.searchPlaceholder')}
            allowClear
            style={{ width: 240 }}
            onSearch={(v) => {
              setQ(v);
              setPage(1);
            }}
          />
          <Select
            allowClear
            placeholder={t('browse.skillFilter')}
            style={{ width: 200 }}
            value={skillId}
            onChange={(v) => {
              setSkillId(v);
              setPage(1);
            }}
            optionFilterProp="label"
            showSearch
            options={skills.map((s) => ({ label: s.name, value: s.id }))}
          />
          <Input.Search
            placeholder={t('browse.majorFilter')}
            allowClear
            style={{ width: 200 }}
            onSearch={(v) => {
              setMajor(v);
              setPage(1);
            }}
          />
          <Tooltip title={t('browse.eligibleOnlyTip')}>
            <Space size={4}>
              <Switch
                checked={eligibleOnly}
                onChange={(v) => {
                  setEligibleOnly(v);
                  setPage(1);
                }}
              />
              <span>{t('browse.eligibleOnly')}</span>
            </Space>
          </Tooltip>
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
            showTotal: (n) => t('browse.total', { count: n }),
          }}
          columns={[
            {
              title: t('browse.colTitle'),
              dataIndex: 'title',
              render: (title: string, record: Topic) => (
                <Link to={`/student/topics/${record.id}`}>{title}</Link>
              ),
            },
            {
              title: t('browse.colTeacher'),
              render: (_: unknown, r: Topic) => r.teacher?.name ?? '-',
            },
            { title: t('browse.colCapacity'), dataIndex: 'capacity', width: 70 },
            {
              title: t('browse.colMode'),
              dataIndex: 'selectionMode',
              width: 110,
              render: (m: Topic['selectionMode']) => <SelectionModeTag mode={m} />,
            },
            {
              title: t('browse.colSkills'),
              render: (_: unknown, r: Topic) =>
                r.requirements?.length
                  ? r.requirements.map((req) => <span key={req.skill.id}>{req.skill.name} </span>)
                  : t('browse.skillAny'),
            },
            {
              title: t('browse.colApplied'),
              width: 80,
              render: (_: unknown, r: Topic) => r._count?.applications ?? 0,
            },
            {
              title: t('browse.colStatus'),
              dataIndex: 'status',
              width: 100,
              render: (s: Topic['status']) => <TopicStatusTag status={s} />,
            },
            {
              title: t('browse.colAction'),
              width: 90,
              render: (_: unknown, r: Topic) => (
                <Link to={`/student/topics/${r.id}`}>{t('common.viewDetail')}</Link>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
