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
import { adminApi, topicApi, userApi } from '@/api';
import type { Assignment, Topic, StudentSearchItem, Paginated } from '@/types';
import { SelectionModeTag } from '@/components/StatusTags';

type ModalMode = 'create' | 'edit' | null;

export default function AdminAssignments() {
  const [data, setData] = useState<Paginated<Assignment>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
  });
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
        message.success('已新增分配');
      } else if (modalMode === 'edit' && editing) {
        await adminApi.assignments.update(editing.id, {
          topicId: values.topicId,
          note: values.note ?? null,
        });
        message.success('已更新');
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
      message.success('已取消分配');
      load();
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  return (
    <div className="page-container">
      <Card
        title="选题结果管理"
        extra={
          <Space>
            <Button onClick={load}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增分配
            </Button>
          </Space>
        }
      >
        <p style={{ color: '#888' }}>
          管理员可在此修正选题数据（改派 / 取消 / 新增），<b>系统锁定后仍可操作</b>。
        </p>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data.items}
          pagination={{
            current: data.page,
            pageSize: 10,
            total: data.total,
            onChange: setPage,
          }}
          columns={[
            { title: '学生', render: (_: unknown, a: Assignment) => a.student?.name ?? '-' },
            { title: '课题', render: (_: unknown, a: Assignment) => a.topic?.title ?? '-' },
            { title: '指导教师', render: (_: unknown, a: Assignment) => a.topic?.teacher?.name ?? '-' },
            {
              title: '方式',
              dataIndex: 'method',
              render: (m: Assignment['method']) => <SelectionModeTag mode={m} />,
            },
            {
              title: '锁定',
              dataIndex: 'locked',
              width: 70,
              render: (l: boolean) => (l ? <Tag color="red">锁</Tag> : '-'),
            },
            { title: '备注', dataIndex: 'note', ellipsis: true, render: (n: string) => n || '-' },
            { title: '确定时间', dataIndex: 'createdAt', render: (t: string) => new Date(t).toLocaleString() },
            {
              title: '操作',
              width: 140,
              render: (_: unknown, a: Assignment) => (
                <Space size="small">
                  <Button size="small" onClick={() => openEdit(a)}>
                    改派
                  </Button>
                  <Popconfirm title="确定取消该学生的选题？" onConfirm={() => remove(a.id)}>
                    <Button size="small" type="link" danger>
                      取消
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={modalMode === 'create' ? '新增分配' : '改派 / 修改备注'}
        open={modalMode !== null}
        onOk={submit}
        onCancel={() => setModalMode(null)}
        confirmLoading={saving}
        okText="保存"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {modalMode === 'create' && (
            <Form.Item
              label="学生"
              name="studentId"
              rules={[{ required: true, message: '请选择学生' }]}
            >
              <Select
                showSearch
                placeholder="搜索姓名/学号"
                filterOption={false}
                onSearch={onStudentSearch}
                options={studentOpts.map((s) => ({
                  label: `${s.name}（${s.studentProfile?.studentNo ?? s.username}）`,
                  value: s.id,
                }))}
              />
            </Form.Item>
          )}
          <Form.Item
            label="课题"
            name="topicId"
            rules={[{ required: true, message: '请选择课题' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择课题"
              options={topics.map((t) => ({ label: t.title, value: t.id }))}
            />
          </Form.Item>
          <Form.Item label="备注" name="note">
            <Input.TextArea rows={2} maxLength={500} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
