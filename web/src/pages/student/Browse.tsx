import { useEffect, useState, useCallback } from 'react';
import { Table, Input, Card, Space, Button, Select } from 'antd';
import { Link } from 'react-router-dom';
import { topicApi, skillApi } from '@/api';
import type { Topic, Skill, Paginated } from '@/types';
import { TopicStatusTag, SelectionModeTag } from '@/components/StatusTags';

export default function Browse() {
  const [data, setData] = useState<Paginated<Topic>>({ items: [], total: 0, page: 1, pageSize: 10 });
  const [skills, setSkills] = useState<Skill[]>([]);
  const [q, setQ] = useState('');
  const [skillId, setSkillId] = useState<number | undefined>();
  const [major, setMajor] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await topicApi.list({ q, skillId, major, page, pageSize });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [q, skillId, major, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    skillApi.list().then(setSkills).catch(() => undefined);
  }, []);

  return (
    <div className="page-container">
      <Card
        title="浏览课题"
        extra={<Button onClick={load}>刷新</Button>}
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="搜索课题标题或描述"
            allowClear
            style={{ width: 240 }}
            onSearch={(v) => {
              setQ(v);
              setPage(1);
            }}
          />
          <Select
            allowClear
            placeholder="按要求技能筛选"
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
            placeholder="按专业要求筛选"
            allowClear
            style={{ width: 200 }}
            onSearch={(v) => {
              setMajor(v);
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
            showTotal: (t) => `共 ${t} 个课题`,
          }}
          columns={[
            {
              title: '课题标题',
              dataIndex: 'title',
              render: (title: string, record: Topic) => (
                <Link to={`/student/topics/${record.id}`}>{title}</Link>
              ),
            },
            {
              title: '指导教师',
              render: (_: unknown, r: Topic) => r.teacher?.name ?? '-',
            },
            { title: '容量', dataIndex: 'capacity', width: 70 },
            {
              title: '选题模式',
              dataIndex: 'selectionMode',
              width: 110,
              render: (m: Topic['selectionMode']) => <SelectionModeTag mode={m} />,
            },
            {
              title: '技能要求',
              render: (_: unknown, r: Topic) =>
                r.requirements?.length
                  ? r.requirements.map((req) => <span key={req.skill.id}>{req.skill.name} </span>)
                  : '不限',
            },
            {
              title: '已申请',
              width: 80,
              render: (_: unknown, r: Topic) => r._count?.applications ?? 0,
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 100,
              render: (s: Topic['status']) => <TopicStatusTag status={s} />,
            },
            {
              title: '操作',
              width: 90,
              render: (_: unknown, r: Topic) => (
                <Link to={`/student/topics/${r.id}`}>查看详情</Link>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
