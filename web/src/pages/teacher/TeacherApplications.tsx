import { useEffect, useState, useCallback } from 'react';
import { Card, Select, Table, Tag, Empty, message } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { topicApi, applicationApi } from '@/api';
import type { Topic, Application, Paginated } from '@/types';

export default function TeacherApplications() {
  const [searchParams] = useSearchParams();
  const urlTopicId = searchParams.get('topicId');

  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState<number | undefined>();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res: Paginated<Topic> = await topicApi.list({ page: 1, pageSize: 100 });
        setTopics(res.items);
        // 优先使用 URL 中的 topicId（来自"我的课题→查看申请"跳转）
        const fromUrl = urlTopicId ? Number(urlTopicId) : undefined;
        if (fromUrl && res.items.some((t) => t.id === fromUrl)) {
          setTopicId(fromUrl);
        } else if (res.items.length) {
          setTopicId(res.items[0].id);
        }
      } catch (err) {
        message.error((err as Error).message);
      }
    })();
  }, [urlTopicId]);

  const loadApps = useCallback(async () => {
    if (!topicId) {
      setApps([]);
      return;
    }
    setLoading(true);
    try {
      setApps(await applicationApi.byTopic(topicId));
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  return (
    <div className="page-container">
      <Card
        title="申请管理"
        extra={
          <Select
            style={{ width: 320 }}
            placeholder="选择课题查看申请人"
            value={topicId}
            onChange={setTopicId}
            options={topics.map((t) => ({
              label: `${t.title}（${t._count?.applications ?? 0} 人申请）`,
              value: t.id,
            }))}
          />
        }
      >
        {!topicId ? (
          <Empty description="暂无课题" />
        ) : (
          <Table
            rowKey="id"
            loading={loading}
            dataSource={apps}
            pagination={false}
            locale={{ emptyText: '暂无申请人' }}
            columns={[
              {
                title: '学生',
                render: (_: unknown, a: Application) => a.student?.name ?? '-',
              },
              {
                title: '专业',
                render: (_: unknown, a: Application) => a.student?.studentProfile?.major ?? '-',
              },
              {
                title: 'GPA',
                render: (_: unknown, a: Application) => a.student?.studentProfile?.gpa ?? '-',
              },
              {
                title: '技能',
                render: (_: unknown, a: Application) =>
                  (a.student?.studentProfile?.skills ?? []).map((s) => (
                    <Tag key={s.skillId}>{s.skill.name}</Tag>
                  )),
              },
              { title: '申请留言', dataIndex: 'message', ellipsis: true, render: (m: string) => m || '-' },
              { title: '申请时间', dataIndex: 'createdAt', render: (t: string) => new Date(t).toLocaleString() },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
