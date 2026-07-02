import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Popconfirm,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tag,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { adminApi, topicApi, userApi } from '@/api';
import type { Assignment, Topic, StudentSearchItem, Paginated } from '@/types';
import { SelectionModeTag } from '@/components/StatusTags';

type ModalMode = 'create' | 'edit' | null;

export default function AdminAssignments() {
  const { t } = useTranslation();
  const [data, setData] = useState<Paginated<Assignment>>({ items: [], total: 0, page: 1, pageSize: 10 });
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [saving, setSaving] = useState(false);
  const [studentOpts, setStudentOpts] = useState<StudentSearchItem[]>([]);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminApi.assignments.list({ page, pageSize: 10 }));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    topicApi
      .list({ page: 1, pageSize: 200 })
      .then((r) => setTopics(r.items))
      .catch(() => undefined);
  }, []);

  const openCreate = () => {
    setModalMode('create');
    setEditing(null);
    setStudentOpts([]);
    form.resetFields();
  };

  const openEdit = (a: Assignment) => {
    setModalMode('edit');
    setEditing(a);
    setStudentOpts([]);
    form.setFieldsValue({ topicId: a.topicId, note: a.note ?? undefined });
  };

  const onStudentSearch = async (v: string) => {
    try {
      setStudentOpts(await userApi.searchStudents(v));
    } catch {
      /* ignore */
    }
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (modalMode === 'create') {
        await adminApi.assignments.create({
          studentId: values.studentId,
          topicId: values.topicId,
          note: values.note,
        });
        message.success(t('common.created'));
      } else if (modalMode === 'edit' && editing) {
        await adminApi.assignments.update(editing.id, {
          topicId: values.topicId,
          note: values.note ?? null,
        });
        message.success(t('common.updated'));
      }
      setModalMode(null);
      load();
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await adminApi.assignments.remove(id);
      message.success(t('common.deleted'));
      load();
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  return (
    <div className="page-container">
      <Card
        title={t('adminAssignments.title')}
        extra={
          <Space>
            <Button onClick={load}>{t('common.refresh')}</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              {t('adminAssignments.create')}
            </Button>
          </Space>
        }
      >
        <p style={{ color: '#888' }}>{t('adminAssignments.hint')}</p>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data.items}
          pagination={{ current: data.page, pageSize: 10, total: data.total, onChange: setPage }}
          columns={[
            { title: t('adminAssignments.colStudent'), render: (_: unknown, a: Assignment) => a.student?.name ?? '-' },
            { title: t('adminAssignments.colTopic'), render: (_: unknown, a: Assignment) => a.topic?.title ?? '-' },
            { title: t('adminAssignments.colTeacher'), render: (_: unknown, a: Assignment) => a.topic?.teacher?.name ?? '-' },
            {
              title: t('adminAssignments.colMode'),
              dataIndex: 'method',
              render: (m: Assignment['method']) => <SelectionModeTag mode={m} />,
            },
            {
              title: t('adminAssignments.colLocked'),
              dataIndex: 'locked',
              width: 70,
              render: (l: boolean) => (l ? <Tag color="red">{t('adminAssignments.lockYes')}</Tag> : '-'),
            },
            { title: t('adminAssignments.colNote'), dataIndex: 'note', ellipsis: true, render: (n: string) => n || '-' },
            { title: t('adminAssignments.colTime'), dataIndex: 'createdAt', render: (tm: string) => new Date(tm).toLocaleString() },
            {
              title: t('common.action'),
              width: 140,
              render: (_: unknown, a: Assignment) => (
                <Space size="small">
                  <Button size="small" onClick={() => openEdit(a)}>
                    {t('adminAssignments.reassign')}
                  </Button>
                  <Popconfirm title={t('adminAssignments.cancelConfirm')} onConfirm={() => remove(a.id)}>
                    <Button size="small" type="link" danger>
                      {t('adminAssignments.cancel')}
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={modalMode === 'create' ? t('adminAssignments.createTitle') : t('adminAssignments.editTitle')}
        open={modalMode !== null}
        onOk={submit}
        onCancel={() => setModalMode(null)}
        confirmLoading={saving}
        okText={t('common.save')}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {modalMode === 'create' && (
            <Form.Item label={t('adminAssignments.fStudent')} name="studentId" rules={[{ required: true, message: t('adminAssignments.requireStudent') }]}>
              <Select
                showSearch
                placeholder={t('adminAssignments.fStudentSearch')}
                filterOption={false}
                onSearch={onStudentSearch}
                options={studentOpts.map((s) => ({
                  label: `${s.name}（${s.studentProfile?.studentNo ?? s.username}）`,
                  value: s.id,
                }))}
              />
            </Form.Item>
          )}
          <Form.Item label={t('adminAssignments.fTopic')} name="topicId" rules={[{ required: true, message: t('adminAssignments.requireTopic') }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder={t('adminAssignments.fTopicPlaceholder')}
              options={topics.map((tp) => ({ label: tp.title, value: tp.id }))}
            />
          </Form.Item>
          <Form.Item label={t('adminAssignments.fNote')} name="note">
            <Input.TextArea rows={2} maxLength={500} placeholder={t('common.optional')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
