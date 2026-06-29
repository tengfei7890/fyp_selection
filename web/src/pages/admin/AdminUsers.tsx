import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Popconfirm,
  Tag,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { adminApi } from '@/api';
import type { User, Paginated } from '@/types';
import { Role, RoleLabels, UserStatus } from '@shared/enums';

export default function AdminUsers() {
  const [data, setData] = useState<Paginated<User>>({ items: [], total: 0, page: 1, pageSize: 10 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminApi.listUsers({ page, pageSize: 10, role: roleFilter, q }));
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, q]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ role: Role.STUDENT });
    setOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    form.setFieldsValue({
      username: u.username,
      name: u.name,
      role: u.role,
      status: u.status ?? UserStatus.ACTIVE,
      email: u.email ?? undefined,
      phone: u.phone ?? undefined,
      studentNo: u.studentProfile?.studentNo,
      major: u.studentProfile?.major,
      gpa: u.studentProfile?.gpa ?? undefined,
      grade: u.studentProfile?.grade ?? undefined,
    });
    setOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        const payload: Record<string, unknown> = {
          name: values.name,
          role: values.role,
          status: values.status,
          email: values.email ?? null,
          phone: values.phone ?? null,
        };
        if (values.password) payload.password = values.password;
        await adminApi.updateUser(editing.id, payload);
        message.success('用户已更新');
      } else {
        await adminApi.createUser({
          username: values.username,
          password: values.password,
          name: values.name,
          role: values.role,
          email: values.email ?? null,
          phone: values.phone ?? null,
          studentNo: values.studentNo,
          major: values.major,
          gpa: values.gpa,
          grade: values.grade,
        });
        message.success('用户已创建');
      }
      setOpen(false);
      load();
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await adminApi.deleteUser(id);
      message.success('用户已删除');
      load();
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  const watchingRole = Form.useWatch('role', form);

  return (
    <div className="page-container">
      <Card
        title="用户管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建用户
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Select
            allowClear
            placeholder="按角色筛选"
            style={{ width: 140 }}
            value={roleFilter}
            onChange={(v) => {
              setRoleFilter(v);
              setPage(1);
            }}
            options={Object.values(Role).map((r) => ({ label: RoleLabels[r], value: r }))}
          />
          <Input.Search
            allowClear
            placeholder="搜索用户名/姓名"
            style={{ width: 220 }}
            onSearch={(v) => {
              setQ(v);
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
            pageSize: 10,
            total: data.total,
            onChange: setPage,
          }}
          columns={[
            { title: '用户名', dataIndex: 'username' },
            { title: '姓名', dataIndex: 'name' },
            {
              title: '角色',
              dataIndex: 'role',
              render: (r: Role) => <Tag color="blue">{RoleLabels[r]}</Tag>,
            },
            {
              title: '状态',
              dataIndex: 'status',
              render: (s: UserStatus) => (
                <Tag color={s === UserStatus.ACTIVE ? 'green' : 'red'}>
                  {s === UserStatus.ACTIVE ? '启用' : '禁用'}
                </Tag>
              ),
            },
            { title: '专业', render: (_: unknown, u: User) => u.studentProfile?.major ?? '-' },
            { title: '创建时间', dataIndex: 'createdAt', render: (t: string) => new Date(t).toLocaleDateString() },
            {
              title: '操作',
              width: 140,
              render: (_: unknown, u: User) => (
                <Space size="small">
                  <Button size="small" onClick={() => openEdit(u)}>
                    编辑
                  </Button>
                  <Popconfirm title="确定删除该用户？" onConfirm={() => remove(u.id)}>
                    <Button size="small" type="link" danger>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={editing ? '编辑用户' : '新建用户'}
        open={open}
        onOk={submit}
        onCancel={() => setOpen(false)}
        confirmLoading={saving}
        width={560}
        okText="保存"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="用户名" name="username" rules={editing ? [] : [{ required: true, message: '请输入用户名' }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          <Form.Item
            label={editing ? '重置密码（留空则不改）' : '密码'}
            name="password"
            rules={editing ? [] : [{ required: true, min: 6, message: '至少 6 位' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input />
          </Form.Item>
          <Space wrap>
            <Form.Item label="角色" name="role" rules={[{ required: true }]} style={{ width: 140 }}>
              <Select options={Object.values(Role).map((r) => ({ label: RoleLabels[r], value: r }))} />
            </Form.Item>
            {editing && (
              <Form.Item label="状态" name="status" style={{ width: 140 }}>
                <Select
                  options={[
                    { label: '启用', value: UserStatus.ACTIVE },
                    { label: '禁用', value: UserStatus.DISABLED },
                  ]}
                />
              </Form.Item>
            )}
          </Space>
          <Space wrap>
            <Form.Item label="邮箱" name="email" style={{ width: 240 }}>
              <Input />
            </Form.Item>
            <Form.Item label="电话" name="phone" style={{ width: 200 }}>
              <Input />
            </Form.Item>
          </Space>

          {(watchingRole === Role.STUDENT || (editing?.studentProfile && watchingRole === Role.STUDENT)) && (
            <>
              <Space wrap>
                <Form.Item
                  label="学号"
                  name="studentNo"
                  rules={editing ? [] : [{ required: true, message: '请输入学号' }]}
                  style={{ width: 160 }}
                >
                  <Input />
                </Form.Item>
                <Form.Item label="专业" name="major" style={{ width: 200 }}>
                  <Input />
                </Form.Item>
                <Form.Item label="年级" name="grade" style={{ width: 120 }}>
                  <Input />
                </Form.Item>
                <Form.Item label="GPA" name="gpa" style={{ width: 120 }}>
                  <InputNumber min={0} max={5} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </Space>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
