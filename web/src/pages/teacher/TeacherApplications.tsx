import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Select,
  Table,
  Tag,
  Empty,
  Button,
  Space,
  Modal,
  Form,
  InputNumber,
  Popconfirm,
  Descriptions,
  message,
} from 'antd';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MessageOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { topicApi, applicationApi, type RangeCriteria } from '@/api';
import type { Topic, Application, Assignment, StudentSearchItem, Paginated } from '@/types';
import StudentPickerModal from '@/components/StudentPickerModal';
import { TopicStatusTag, SelectionModeTag, ApplicationStatusTag } from '@/components/StatusTags';
import { SelectionMode, ApplicationStatus } from '@shared/enums';

export default function TeacherApplications() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlTopicId = searchParams.get('topicId');

  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState<number | undefined>();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [rangeForm] = Form.useForm();

  useEffect(() => {
    (async () => {
      try {
        const res: Paginated<Topic> = await topicApi.list({ page: 1, pageSize: 100 });
        setTopics(res.items);
        const fromUrl = urlTopicId ? Number(urlTopicId) : undefined;
        if (fromUrl && res.items.some((tp) => tp.id === fromUrl)) setTopicId(fromUrl);
        else if (res.items.length) setTopicId(res.items[0].id);
      } catch (err) {
        message.error((err as Error).message);
      }
    })();
  }, [urlTopicId]);

  const loadDetail = useCallback(async () => {
    if (!topicId) { setTopic(null); return; }
    setLoading(true);
    try {
      const [tp, a, asg] = await Promise.all([
        topicApi.get(topicId),
        applicationApi.byTopic(topicId),
        topicApi.assignments(topicId),
      ]);
      setTopic(tp); setApps(a); setAssignments(asg);
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => { loadDetail(); }, [loadDetail]);
  const reload = () => loadDetail();

  const runRandom = async () => {
    setBusy(true);
    try {
      const r = await topicApi.select(topicId!, {});
      message.success(t('teacherApp.msgRunRandom', { count: r.assigned }));
      reload();
    } catch (err) { message.error((err as Error).message); } finally { setBusy(false); }
  };

  const runRange = async () => {
    const values = await rangeForm.validateFields();
    setBusy(true);
    try {
      const criteria: RangeCriteria = { gpaMin: values.gpaMin ?? undefined, majors: values.majors?.length ? values.majors : undefined };
      const r = await topicApi.select(topicId!, criteria);
      message.success(t('teacherApp.msgRunRange', { count: r.assigned }));
      setRangeOpen(false); rangeForm.resetFields(); reload();
    } catch (err) { if ((err as Error).message) message.error((err as Error).message); } finally { setBusy(false); }
  };

  const doDirectAssign = async (students: StudentSearchItem[]) => {
    setPickerOpen(false);
    setBusy(true);
    try {
      const r = await topicApi.assignDirect(topicId!, students.map((s) => s.id));
      message.success(t('teacherApp.msgDirect', { count: r.assigned, skipped: r.skipped ? t('teacherApp.msgDirectSkipped', { count: r.skipped }) : '' }));
      reload();
    } catch (err) { message.error((err as Error).message); } finally { setBusy(false); }
  };

  const accept = async (id: number) => {
    setBusy(true);
    try { await applicationApi.accept(id); message.success(t('teacherApp.msgAccept')); reload(); }
    catch (err) { message.error((err as Error).message); } finally { setBusy(false); }
  };
  const reject = async (id: number) => {
    setBusy(true);
    try { await applicationApi.reject(id); message.success(t('teacherApp.msgReject')); reload(); }
    catch (err) { message.error((err as Error).message); } finally { setBusy(false); }
  };

  const clear = async () => {
    setBusy(true);
    try { await topicApi.clearAssignments(topicId!); message.success(t('teacherApp.msgClear')); reload(); }
    catch (err) { message.error((err as Error).message); } finally { setBusy(false); }
  };

  const assignedCount = assignments.length;
  const capacity = topic?.capacity ?? 0;
  const isFull = capacity > 0 && assignedCount >= capacity;
  const mode = topic?.selectionMode;

  return (
    <div className="page-container">
      <Card
        title={t('teacherApp.title')}
        extra={
          <Select
            style={{ width: 320 }}
            placeholder={t('teacherApp.selectPlaceholder')}
            value={topicId}
            onChange={setTopicId}
            options={topics.map((tp) => ({ label: `${tp.title}（${t('teacherApp.topicApplied', { count: tp._count?.applications ?? 0 })}）`, value: tp.id }))}
          />
        }
      >
        {!topic ? (
          <Empty description={t('teacherApp.selectPlaceholder')} />
        ) : (
          <>
            <Descriptions size="small" bordered column={4} style={{ marginBottom: 16 }}>
              <Descriptions.Item label={t('browse.colMode')}><SelectionModeTag mode={mode!} /></Descriptions.Item>
              <Descriptions.Item label={t('common.status')}><TopicStatusTag status={topic.status} /></Descriptions.Item>
              <Descriptions.Item label={t('teacherApp.capacity')}>{capacity}</Descriptions.Item>
              <Descriptions.Item label={t('teacherApp.assigned')}>{assignedCount} {isFull && <Tag color="green">{t('teacherApp.full')}</Tag>}</Descriptions.Item>
            </Descriptions>

            <Space wrap style={{ marginBottom: 16 }}>
              {mode === SelectionMode.MUTUAL && <span style={{ color: '#888' }}>{t('teacherApp.mutualHint')}</span>}
              {mode === SelectionMode.RANDOM && <Button type="primary" loading={busy} disabled={isFull} onClick={runRandom}>{t('teacherApp.runRandom')}</Button>}
              {mode === SelectionMode.RANGE_RANDOM && <Button type="primary" loading={busy} disabled={isFull} onClick={() => setRangeOpen(true)}>{t('teacherApp.runRange')}</Button>}
              {mode === SelectionMode.DIRECT && <Button type="primary" loading={busy} disabled={isFull} onClick={() => setPickerOpen(true)}>{t('teacherApp.directPick')}</Button>}
              {assignedCount > 0 && (
                <Popconfirm title={t('teacherApp.clearConfirm')} onConfirm={clear}>
                  <Button danger loading={busy}>{t('teacherApp.clear')}</Button>
                </Popconfirm>
              )}
            </Space>

            <Card type="inner" title={t('teacherApp.applicants', { count: apps.length })} size="small" style={{ marginBottom: 16 }}>
              <Table
                rowKey="id"
                loading={loading}
                dataSource={apps}
                pagination={false}
                size="small"
                scroll={{ y: 260 }}
                locale={{ emptyText: t('teacherApp.noApplicants') }}
                columns={[
                  { title: t('teacherApp.colStudent'), render: (_: unknown, a: Application) => a.student?.name ?? '-' },
                  { title: t('teacherApp.colMajor'), render: (_: unknown, a: Application) => a.student?.studentProfile?.major ?? '-' },
                  { title: t('teacherApp.colGpa'), width: 70, render: (_: unknown, a: Application) => a.student?.studentProfile?.gpa ?? '-' },
                  {
                    title: t('teacherApp.colEligible'),
                    width: 90,
                    render: (_: unknown, a: Application) => (a.eligible === undefined ? '-' : a.eligible ? <Tag color="green">{t('teacherApp.eligible')}</Tag> : <Tag color="red">{t('teacherApp.ineligible')}</Tag>),
                  },
                  {
                    title: t('teacherApp.colSkills'),
                    render: (_: unknown, a: Application) => (a.student?.studentProfile?.skills ?? []).map((s) => <Tag key={s.skillId}>{s.skill.name}</Tag>),
                  },
                  { title: t('teacherApp.colMessage'), dataIndex: 'message', ellipsis: true, render: (m: string) => m || '-' },
                  {
                    title: t('teacherApp.colStatus'),
                    width: 130,
                    render: (_: unknown, a: Application) => {
                      if (a.status === ApplicationStatus.REJECTED) {
                        if (a.rejectReason === 'cascade') {
                          const otherTopic = a.student?.assignments?.[0]?.topic?.title;
                          return <Tag color="orange" title={otherTopic ? t('messages.topicBubble', { title: otherTopic }) : undefined}>{t('appRejectReason.cascade')}</Tag>;
                        }
                        return <Tag color="red">{t('appRejectReason.manual')}</Tag>;
                      }
                      return <ApplicationStatusTag status={a.status} />;
                    },
                  },
                  {
                    title: t('common.action'),
                    width: 190,
                    render: (_: unknown, a: Application) => (
                      <Space size="small" wrap>
                        {a.status === ApplicationStatus.PENDING && (
                          <>
                            <Button size="small" type="primary" loading={busy} onClick={() => accept(a.id)}>{t('teacherApp.accept')}</Button>
                            <Button size="small" danger loading={busy} onClick={() => reject(a.id)}>{t('teacherApp.reject')}</Button>
                          </>
                        )}
                        <Button size="small" type="link" icon={<MessageOutlined />} onClick={() => navigate(`/teacher/messages?partnerId=${a.studentId}&partnerName=${encodeURIComponent(a.student?.name ?? '')}&topicId=${topicId}`)}>
                          {t('teacherApp.contact')}
                        </Button>
                      </Space>
                    ),
                  },
                ]}
              />
            </Card>

            <Card type="inner" title={t('teacherApp.results', { assigned: assignedCount, capacity })} size="small">
              <Table
                rowKey="id"
                dataSource={assignments}
                pagination={false}
                size="small"
                locale={{ emptyText: t('teacherApp.noResults') }}
                columns={[
                  { title: t('teacherApp.colStudent'), render: (_: unknown, a: Assignment) => a.student?.name ?? '-' },
                  { title: t('adminUsers.colUsername'), render: (_: unknown, a: Assignment) => a.student?.username ?? '-' },
                  { title: t('adminAssignments.colMode'), dataIndex: 'method', render: (m: Assignment['method']) => <SelectionModeTag mode={m} /> },
                  { title: t('adminAssignments.colTime'), dataIndex: 'createdAt', render: (tm: string) => new Date(tm).toLocaleString() },
                ]}
              />
            </Card>
          </>
        )}
      </Card>

      <StudentPickerModal open={pickerOpen} excludeIds={assignments.map((a) => a.studentId)} onClose={() => setPickerOpen(false)} onConfirm={doDirectAssign} />

      <Modal title={t('teacherApp.rangeTitle')} open={rangeOpen} onOk={runRange} onCancel={() => setRangeOpen(false)} confirmLoading={busy} okText={t('teacherApp.rangeOk')} destroyOnClose>
        <Form form={rangeForm} layout="vertical">
          <Form.Item label={t('teacherApp.rangeGpa')} name="gpaMin">
            <InputNumber min={0} max={5} step={0.1} style={{ width: '100%' }} placeholder="3.5" />
          </Form.Item>
          <Form.Item label={t('teacherApp.rangeMajor')} name="majors">
            <Select mode="tags" tokenSeparators={[',', ' ']} />
          </Form.Item>
          <p style={{ color: '#888', margin: 0 }}>{t('teacherApp.rangeHint')}</p>
        </Form>
      </Modal>
    </div>
  );
}
