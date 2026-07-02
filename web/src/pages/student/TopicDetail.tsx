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
import { useTranslation } from 'react-i18next';
import { topicApi, favoriteApi, applicationApi } from '@/api';
import type { Topic, Application, Favorite } from '@/types';
import { TopicStatusTag, SelectionModeTag } from '@/components/StatusTags';

export default function TopicDetail() {
  const { t } = useTranslation();
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
      const [tp, favs, apps] = await Promise.all([
        topicApi.get(topicId),
        favoriteApi.mine(),
        applicationApi.mine(),
      ]);
      setTopic(tp);
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
        title={t('topicDetail.notFound')}
        extra={<Button onClick={() => navigate('/student')}>{t('topicDetail.back')}</Button>}
      />
    );

  const isFavorited = favorites.some((f) => f.topicId === topicId);
  const myApp = applications.find((a) => a.topicId === topicId);

  const toggleFavorite = async () => {
    try {
      if (isFavorited) {
        await favoriteApi.remove(topicId);
        setFavorites((prev) => prev.filter((f) => f.topicId !== topicId));
      } else {
        await favoriteApi.create(topicId);
        setFavorites((prev) => [...prev, { studentId: 0, topicId, createdAt: '', topic }]);
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
      message.success(t('common.success'));
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
      <Button icon={<ArrowLeftOutlined />} style={{ marginBottom: 16 }} onClick={() => navigate('/student')}>
        {t('topicDetail.back')}
      </Button>
      <Card
        title={topic.title}
        extra={
          <Space>
            <Button icon={isFavorited ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />} onClick={toggleFavorite}>
              {isFavorited ? t('topicDetail.favorited') : t('topicDetail.favorite')}
            </Button>
            <Button type="primary" disabled={!!myApp} onClick={() => setApplyOpen(true)}>
              {myApp
                ? t('topicDetail.applied', {
                    status: myApp.status === 'PENDING' ? t('topicDetail.appliedPending') : myApp.status,
                  })
                : t('topicDetail.apply')}
            </Button>
            <Button
              icon={<MessageOutlined />}
              onClick={() =>
                navigate(
                  `/student/messages?partnerId=${topic.teacherId}&partnerName=${encodeURIComponent(topic.teacher?.name ?? '')}&topicId=${topic.id}`,
                )
              }
            >
              {t('topicDetail.contactTeacher')}
            </Button>
          </Space>
        }
      >
        <p style={{ whiteSpace: 'pre-wrap', color: '#555' }}>{topic.description}</p>
        <Descriptions column={2} bordered size="small" style={{ marginTop: 16 }}>
          <Descriptions.Item label={t('topicDetail.teacher')}>{topic.teacher?.name}</Descriptions.Item>
          <Descriptions.Item label={t('topicDetail.capacity')}>{topic.capacity} {t('topicDetail.capacityUnit')}</Descriptions.Item>
          <Descriptions.Item label={t('topicDetail.mode')}><SelectionModeTag mode={topic.selectionMode} /></Descriptions.Item>
          <Descriptions.Item label={t('topicDetail.status')}><TopicStatusTag status={topic.status} /></Descriptions.Item>
          <Descriptions.Item label={t('topicDetail.gpaReq')}>
            {topic.gpaThreshold ? t('topicDetail.gpaMin', { value: topic.gpaThreshold }) : t('topicDetail.gpaAny')}
          </Descriptions.Item>
          <Descriptions.Item label={t('topicDetail.majorReq')}>{topic.majorRestriction || t('topicDetail.majorAny')}</Descriptions.Item>
          <Descriptions.Item label={t('topicDetail.skillReq')} span={2}>
            {topic.requirements?.length
              ? topic.requirements.map((r) => <Tag key={r.skill.id}>{r.skill.name}</Tag>)
              : t('topicDetail.skillAny')}
          </Descriptions.Item>
          <Descriptions.Item label={t('topicDetail.year')} span={2}>{topic.academicYear || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Modal
        title={t('topicDetail.applyTitle')}
        open={applyOpen}
        onOk={submitApply}
        onCancel={() => setApplyOpen(false)}
        confirmLoading={submitting}
        okText={t('topicDetail.submit')}
      >
        <p>{t('topicDetail.applyBody', { title: topic.title })}</p>
        <Form form={form}>
          <Form.Item name="message">
            <Input.TextArea rows={4} maxLength={500} placeholder={t('topicDetail.applyPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
