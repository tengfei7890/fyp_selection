import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Modal,
  Input,
  Form,
  message,
  Spin,
  Result,
} from 'antd';
import { StarFilled, StarOutlined, ArrowLeftOutlined, MessageOutlined } from '@ant-design/icons';
import { topicApi, favoriteApi, applicationApi } from '@/api';
import type { Topic, Application, Favorite } from '@/types';
import {
  TopicStatusTag,
  SelectionModeTag,
} from '@/components/StatusTags';

export default function TopicDetail() {
  const { id } = useParams<{ id: string }>();
  const topicId = Number(id);
  const navigate = useNavigate();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, favs, apps] = await Promise.all([
        topicApi.get(topicId),
        favoriteApi.mine(),
        applicationApi.mine(),
      ]);
      setTopic(t);
      setFavorites(favs);
      setApplications(apps);
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Spin style={{ display: 'block', marginTop: 80 }} />;
  if (!topic)
    return (
      <Result
        status="404"
        title="课题不存在"
        extra={<Button onClick={() => navigate('/student')}>返回列表</Button>}
      />
    );

  const isFavorited = favorites.some((f) => f.topicId === topicId);
  const myApp = applications.find((a) => a.topicId === topicId);

  const toggleFavorite = async () => {
    try {
      if (isFavorited) {
        await favoriteApi.remove(topicId);
        setFavorites((prev) => prev.filter((f) => f.topicId !== topicId));
        message.success('已取消收藏');
      } else {
        await favoriteApi.create(topicId);
        setFavorites((prev) => [...prev, { studentId: 0, topicId, createdAt: '', topic }]);
        message.success('已收藏');
      }
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  const submitApply = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await applicationApi.create(topicId, values.message);
      message.success('申请已提交');
      setApplyOpen(false);
      form.resetFields();
      load();
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <Button
        icon={<ArrowLeftOutlined />}
        style={{ marginBottom: 16 }}
        onClick={() => navigate('/student')}
      >
        返回列表
      </Button>
      <Card
        title={topic.title}
        extra={
          <Space>
            <Button
              icon={isFavorited ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
              onClick={toggleFavorite}
            >
              {isFavorited ? '已收藏' : '收藏'}
            </Button>
            <Button
              type="primary"
              disabled={!!myApp}
              onClick={() => setApplyOpen(true)}
            >
              {myApp ? `已申请（${myApp.status === 'PENDING' ? '待处理' : myApp.status}）` : '申请该课题'}
            </Button>
            <Button
              icon={<MessageOutlined />}
              onClick={() =>
                navigate(
                  `/student/messages?partnerId=${topic.teacherId}&partnerName=${encodeURIComponent(topic.teacher?.name ?? '')}&topicId=${topic.id}`,
                )
              }
            >
              联系教师
            </Button>
          </Space>
        }
      >
        <p style={{ whiteSpace: 'pre-wrap', color: '#555' }}>{topic.description}</p>

        <Descriptions column={2} bordered size="small" style={{ marginTop: 16 }}>
          <Descriptions.Item label="指导教师">{topic.teacher?.name}</Descriptions.Item>
          <Descriptions.Item label="容量">{topic.capacity} 人</Descriptions.Item>
          <Descriptions.Item label="选题模式">
            <SelectionModeTag mode={topic.selectionMode} />
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <TopicStatusTag status={topic.status} />
          </Descriptions.Item>
          <Descriptions.Item label="GPA 要求">
            {topic.gpaThreshold ? `≥ ${topic.gpaThreshold}` : '不限'}
          </Descriptions.Item>
          <Descriptions.Item label="专业要求">{topic.majorRestriction || '不限'}</Descriptions.Item>
          <Descriptions.Item label="技能要求" span={2}>
            {topic.requirements?.length
              ? topic.requirements.map((r) => <Tag key={r.skill.id}>{r.skill.name}</Tag>)
              : '不限'}
          </Descriptions.Item>
          <Descriptions.Item label="学年" span={2}>
            {topic.academicYear || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Modal
        title="申请课题"
        open={applyOpen}
        onOk={submitApply}
        onCancel={() => setApplyOpen(false)}
        confirmLoading={submitting}
        okText="提交申请"
      >
        <p>你正在申请《{topic.title}》，可附上一段简短留言：</p>
        <Form form={form}>
          <Form.Item name="message">
            <Input.TextArea rows={4} maxLength={500} placeholder="向老师介绍你的背景与意向（选填）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
