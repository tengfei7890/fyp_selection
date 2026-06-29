import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Space, Popconfirm, message } from 'antd';
import { Link } from 'react-router-dom';
import { favoriteApi } from '@/api';
import type { Favorite } from '@/types';
import { SelectionModeTag } from '@/components/StatusTags';

export default function Favorites() {
  const [items, setItems] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await favoriteApi.mine());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (topicId: number) => {
    try {
      await favoriteApi.remove(topicId);
      setItems((prev) => prev.filter((f) => f.topicId !== topicId));
      message.success('已取消收藏');
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  return (
    <div className="page-container">
      <Card title="我的收藏" extra={<Button onClick={load}>刷新</Button>}>
        <Table
          rowKey="topicId"
          loading={loading}
          dataSource={items}
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: '课题标题',
              render: (_: unknown, r: Favorite) => (
                <Link to={`/student/topics/${r.topicId}`}>{r.topic.title}</Link>
              ),
            },
            { title: '指导教师', render: (_: unknown, r: Favorite) => r.topic.teacher?.name },
            {
              title: '选题模式',
              dataIndex: ['topic', 'selectionMode'],
              render: (m: Favorite['topic']['selectionMode']) => <SelectionModeTag mode={m} />,
            },
            { title: '收藏时间', dataIndex: 'createdAt', render: (t: string) => new Date(t).toLocaleString() },
            {
              title: '操作',
              render: (_: unknown, r: Favorite) => (
                <Space>
                  <Link to={`/student/topics/${r.topicId}`}>查看</Link>
                  <Popconfirm title="确定取消收藏？" onConfirm={() => remove(r.topicId)}>
                    <Button type="link" danger size="small">
                      取消收藏
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
