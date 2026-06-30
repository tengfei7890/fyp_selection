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
import { topicApi, applicationApi, type RangeCriteria } from '@/api';
import type {
  Topic,
  Application,
  Assignment,
  StudentSearchItem,
  Paginated,
} from '@/types';
import { MessageOutlined } from '@ant-design/icons';
import StudentPickerModal from '@/components/StudentPickerModal';
import {
  TopicStatusTag,
  SelectionModeTag,
  ApplicationStatusTag,
} from '@/components/StatusTags';
import { SelectionMode, ApplicationStatus } from '@shared/enums';

export default function TeacherApplications() {
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

  // 加载教师自己的课题列表
  useEffect(() => {
    (async () => {
      try {
        const res: Paginated<Topic> = await topicApi.list({ page: 1, pageSize: 100 });
        setTopics(res.items);
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

  const loadDetail = useCallback(async () => {
    if (!topicId) {
      setTopic(null);
      return;
    }
    setLoading(true);
    try {
      const [t, a, asg] = await Promise.all([
        topicApi.get(topicId),
        applicationApi.byTopic(topicId),
        topicApi.assignments(topicId),
      ]);
      setTopic(t);
      setApps(a);
      setAssignments(asg);
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const reload = () => loadDetail();

  /* ----------------------------- 选题动作 ----------------------------- */

  const runRandom = async () => {
    setBusy(true);
    try {
      const r = await topicApi.select(topicId!, {});
      message.success(`已随机确定 ${r.assigned} 人`);
      reload();
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runRange = async () => {
    const values = await rangeForm.validateFields();
    setBusy(true);
    try {
      const criteria: RangeCriteria = {
        gpaMin: values.gpaMin ?? undefined,
        majors: values.majors?.length ? values.majors : undefined,
      };
      const r = await topicApi.select(topicId!, criteria);
      message.success(`已在范围内随机确定 ${r.assigned} 人`);
      setRangeOpen(false);
      rangeForm.resetFields();
      reload();
    } catch (err) {
      if ((err as Error).message) message.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doDirectAssign = async (students: StudentSearchItem[]) => {
    setPickerOpen(false);
    setBusy(true);
    try {
      const r = await topicApi.assignDirect(
        topicId!,
        students.map((s) => s.id),
      );
      message.success(`已直接指定 ${r.assigned} 人${r.skipped ? `（${r.skipped} 人因容量/重复未计入）` : ''}`);
      reload();
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const accept = async (id: number) => {
    setBusy(true);
    try {
      await applicationApi.accept(id);
      message.success('已通过该申请');
      reload();
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reject = async (id: number) => {
    setBusy(true);
    try {
      await applicationApi.reject(id);
      message.success('已拒绝该申请');
      reload();
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    try {
      await topicApi.clearAssignments(topicId!);
      message.success('已清空结果，可重新选题');
      reload();
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const assignedCount = assignments.length;
  const capacity = topic?.capacity ?? 0;
  const isFull = capacity > 0 && assignedCount >= capacity;
  const mode = topic?.selectionMode;

  return (
    <div className="page-container">
      <Card
        title="申请管理与选题"
        extra={
          <Select
            style={{ width: 320 }}
            placeholder="选择课题"
            value={topicId}
            onChange={setTopicId}
            options={topics.map((t) => ({
              label: `${t.title}（申请 ${t._count?.applications ?? 0}）`,
              value: t.id,
            }))}
          />
        }
      >
        {!topic ? (
          <Empty description="请选择课题" />
        ) : (
          <>
            <Descriptions size="small" bordered column={4} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="选题模式">
                <SelectionModeTag mode={mode!} />
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <TopicStatusTag status={topic.status} />
              </Descriptions.Item>
              <Descriptions.Item label="容量">{capacity}</Descriptions.Item>
              <Descriptions.Item label="已定稿">
                {assignedCount} {isFull && <Tag color="green">已满员</Tag>}
              </Descriptions.Item>
            </Descriptions>

            <Space wrap style={{ marginBottom: 16 }}>
              {mode === SelectionMode.MUTUAL && (
                <span style={{ color: '#888' }}>双向互选：在下方申请人列表逐条「通过/拒绝」。</span>
              )}
              {mode === SelectionMode.RANDOM && (
                <Button type="primary" loading={busy} disabled={isFull} onClick={runRandom}>
                  执行随机选题
                </Button>
              )}
              {mode === SelectionMode.RANGE_RANDOM && (
                <Button type="primary" loading={busy} disabled={isFull} onClick={() => setRangeOpen(true)}>
                  执行范围随机
                </Button>
              )}
              {mode === SelectionMode.DIRECT && (
                <Button type="primary" loading={busy} disabled={isFull} onClick={() => setPickerOpen(true)}>
                  直接指定学生
                </Button>
              )}
              {assignedCount > 0 && (
                <Popconfirm
                  title="清空该课题全部选题结果并重新选择？"
                  onConfirm={clear}
                >
                  <Button danger loading={busy}>
                    清空结果（重选）
                  </Button>
                </Popconfirm>
              )}
            </Space>

            <Card type="inner" title={`申请人（${apps.length}）`} size="small" style={{ marginBottom: 16 }}>
              <Table
                rowKey="id"
                loading={loading}
                dataSource={apps}
                pagination={false}
                size="small"
                scroll={{ y: 260 }}
                locale={{ emptyText: '暂无申请人' }}
                columns={[
                  { title: '学生', render: (_: unknown, a: Application) => a.student?.name ?? '-' },
                  { title: '专业', render: (_: unknown, a: Application) => a.student?.studentProfile?.major ?? '-' },
                  { title: 'GPA', width: 70, render: (_: unknown, a: Application) => a.student?.studentProfile?.gpa ?? '-' },
                  {
                    title: '技能',
                    render: (_: unknown, a: Application) =>
                      (a.student?.studentProfile?.skills ?? []).map((s) => (
                        <Tag key={s.skillId}>{s.skill.name}</Tag>
                      )),
                  },
                  { title: '留言', dataIndex: 'message', ellipsis: true, render: (m: string) => m || '-' },
                  {
                    title: '状态',
                    width: 120,
                    render: (_: unknown, a: Application) => {
                      if (a.status === ApplicationStatus.REJECTED) {
                        if (a.rejectReason === 'cascade') {
                          const otherTopic = a.student?.assignments?.[0]?.topic?.title;
                          return (
                            <Tag
                              color="orange"
                              title={otherTopic ? `该生已确定：${otherTopic}` : undefined}
                            >
                              已选其他课题
                            </Tag>
                          );
                        }
                        return <Tag color="red">教师拒绝</Tag>;
                      }
                      return <ApplicationStatusTag status={a.status} />;
                    },
                  },
                  {
                    title: '操作',
                    width: 190,
                    render: (_: unknown, a: Application) => (
                      <Space size="small" wrap>
                        {a.status === ApplicationStatus.PENDING && (
                          <>
                            <Button size="small" type="primary" loading={busy} onClick={() => accept(a.id)}>
                              通过
                            </Button>
                            <Button size="small" danger loading={busy} onClick={() => reject(a.id)}>
                              拒绝
                            </Button>
                          </>
                        )}
                        <Button
                          size="small"
                          type="link"
                          icon={<MessageOutlined />}
                          onClick={() =>
                            navigate(
                              `/teacher/messages?partnerId=${a.studentId}&partnerName=${encodeURIComponent(a.student?.name ?? '')}&topicId=${topicId}`,
                            )
                          }
                        >
                          联系
                        </Button>
                      </Space>
                    ),
                  },
                ]}
              />
            </Card>

            <Card
              type="inner"
              title={`已定稿名单（${assignedCount}/${capacity}）`}
              size="small"
            >
              <Table
                rowKey="id"
                dataSource={assignments}
                pagination={false}
                size="small"
                locale={{ emptyText: '尚未确定人选' }}
                columns={[
                  { title: '学生', render: (_: unknown, a: Assignment) => a.student?.name ?? '-' },
                  { title: '用户名', render: (_: unknown, a: Assignment) => a.student?.username ?? '-' },
                  {
                    title: '方式',
                    dataIndex: 'method',
                    render: (m: Assignment['method']) => <SelectionModeTag mode={m} />,
                  },
                  { title: '确定时间', dataIndex: 'createdAt', render: (t: string) => new Date(t).toLocaleString() },
                ]}
              />
            </Card>
          </>
        )}
      </Card>

      <StudentPickerModal
        open={pickerOpen}
        excludeIds={assignments.map((a) => a.studentId)}
        onClose={() => setPickerOpen(false)}
        onConfirm={doDirectAssign}
      />

      <Modal
        title="范围随机 — 设置筛选条件"
        open={rangeOpen}
        onOk={runRange}
        onCancel={() => setRangeOpen(false)}
        confirmLoading={busy}
        okText="在范围内随机"
        destroyOnClose
      >
        <Form form={rangeForm} layout="vertical">
          <Form.Item label="GPA 下限（留空不限）" name="gpaMin">
            <InputNumber min={0} max={5} step={0.1} style={{ width: '100%' }} placeholder="如 3.5" />
          </Form.Item>
          <Form.Item label="限定专业（输入后回车，可多个）" name="majors">
            <Select mode="tags" placeholder="如 软件工程" tokenSeparators={[',', ' ']} />
          </Form.Item>
          <p style={{ color: '#888', margin: 0 }}>
            将在「满足课题要求」的申请人中，按上述条件筛选后随机抽取至满员。
          </p>
        </Form>
      </Modal>
    </div>
  );
}
