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
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/api';
import type { User, Paginated } from '@/types';
import { Role, UserStatus } from '@shared/enums';

export default function AdminUsers() {
  const { t } = useTranslation();
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
        message.success(t('common.updated'));
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
        message.success(t('common.created'));
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
      message.success(t('common.deleted'));
      load();
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  const watchingRole = Form.useWatch('role', form);

  return (
    <div className="page-container">
      <Card
        title={t('adminUsers.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('adminUsers.create')}
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Select
            allowClear
            placeholder={t('adminUsers.filterRole')}
            style={{ width: 140 }}
            value={roleFilter}
            onChange={(v) => { setRoleFilter(v); setPage(1); }}
            options={Object.values(Role).map((r) => ({ label: t('role.' + r), value: r }))}
          />
          <Input.Search
            allowClear
            placeholder={t('adminUsers.searchPlaceholder')}
            style={{ width: 220 }}
            onSearch={(v) => { setQ(v); setPage(1); }}
          />
        </Space>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data.items}
          pagination={{ current: data.page, pageSize: 10, total: data.total, onChange: setPage }}
          columns={[
            { title: t('adminUsers.colUsername'), dataIndex: 'username' },
            { title: t('adminUsers.colName'), dataIndex: 'name' },
            { title: t('adminUsers.colRole'), dataIndex: 'role', render: (r: Role) => <Tag color="blue">{t('role.' + r)}</Tag> },
            {
              title: t('adminUsers.colStatus'),
              dataIndex: 'status',
              render: (s: UserStatus) => <Tag color={s === UserStatus.ACTIVE ? 'green' : 'red'}>{t('userStatus.' + s)}</Tag>,
            },
            { title: t('adminUsers.colMajor'), render: (_: unknown, u: User) => u.studentProfile?.major ?? '-' },
            { title: t('adminUsers.colCreated'), dataIndex: 'createdAt', render: (tm: string) => new Date(tm).toLocaleDateString() },
            {
              title: t('common.action'),
              width: 140,
              render: (_: unknown, u: User) => (
                <Space size="small">
                  <Button size="small" onClick={() => openEdit(u)}>{t('common.edit')}</Button>
                  <Popconfirm title={t('adminUsers.deleteConfirm')} onConfirm={() => remove(u.id)}>
                    <Button size="small" type="link" danger>{t('common.delete')}</Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={editing ? t('adminUsers.editTitle') : t('adminUsers.createTitle')}
        open={open}
        onOk={submit}
        onCancel={() => setOpen(false)}
        confirmLoading={saving}
        width={560}
        okText={t('common.save')}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label={t('adminUsers.fUsername')} name="username" rules={editing ? [] : [{ required: true, message: t('adminUsers.requireUsername') }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          <Form.Item label={editing ? t('adminUsers.fPasswordEdit') : t('adminUsers.fPassword')} name="password" rules={editing ? [] : [{ required: true, min: 6, message: t('adminUsers.requirePassword') }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item label={t('adminUsers.fName')} name="name" rules={[{ required: true, message: t('adminUsers.requireName') }]}>
            <Input />
          </Form.Item>
          <Space wrap>
            <Form.Item label={t('adminUsers.fRole')} name="role" rules={[{ required: true }]} style={{ width: 140 }}>
              <Select options={Object.values(Role).map((r) => ({ label: t('role.' + r), value: r }))} />
            </Form.Item>
            {editing && (
              <Form.Item label={t('adminUsers.fStatus')} name="status" style={{ width: 140 }}>
                <Select options={[{ label: t('userStatus.ACTIVE'), value: UserStatus.ACTIVE }, { label: t('userStatus.DISABLED'), value: UserStatus.DISABLED }]} />
              </Form.Item>
            )}
          </Space>
          <Space wrap>
            <Form.Item label={t('adminUsers.fEmail')} name="email" style={{ width: 240 }}>
              <Input />
            </Form.Item>
            <Form.Item label={t('adminUsers.fPhone')} name="phone" style={{ width: 200 }}>
              <Input />
            </Form.Item>
          </Space>
          {watchingRole === Role.STUDENT && (
            <Space wrap>
              <Form.Item label={t('adminUsers.fStudentNo')} name="studentNo" rules={editing ? [] : [{ required: true, message: t('adminUsers.requireStudentNo') }]} style={{ width: 160 }}>
                <Input />
              </Form.Item>
              <Form.Item label={t('adminUsers.fMajor')} name="major" style={{ width: 200 }}>
                <Input />
              </Form.Item>
              <Form.Item label={t('profile.grade')} name="grade" style={{ width: 120 }}>
                <Input />
              </Form.Item>
              <Form.Item label={t('profile.gpa')} name="gpa" style={{ width: 120 }}>
                <InputNumber min={0} max={5} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Space>
          )}
        </Form>
      </Modal>
    </div>
  );
}
