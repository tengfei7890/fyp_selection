import { useEffect, useState } from 'react';
import { Card, Form, Switch, Select, Button, Alert, Space, message, Spin } from 'antd';
import { adminApi } from '@/api';
import type { SystemSettings } from '@/types';
import { SystemPhase, SystemPhaseLabels } from '@shared/enums';

export default function AdminSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    adminApi
      .getSettings()
      .then((s) => {
        setSettings(s);
        form.setFieldsValue({ isLocked: s.isLocked, phase: s.phase });
      });
  }, [form]);

  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const updated = await adminApi.updateSettings({
        isLocked: values.isLocked,
        phase: values.phase,
      });
      setSettings(updated);
      message.success('系统设置已保存');
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <Spin style={{ display: 'block', marginTop: 80 }} />;

  return (
    <div className="page-container">
      <Card title="系统设置" style={{ maxWidth: 640 }}>
        <Alert
          style={{ marginBottom: 24 }}
          type="warning"
          showIcon
          message="锁定系统后，学生与教师的写操作（申请、课题增改等）将被禁止；管理员仍可修正选题数据。"
        />
        <Form form={form} layout="vertical">
          <Form.Item label="当前选题阶段" name="phase">
            <Select
              options={Object.values(SystemPhase).map((p) => ({ label: SystemPhaseLabels[p], value: p }))}
            />
          </Form.Item>
          <Form.Item label="锁定系统" name="isLocked" valuePropName="checked">
            <Switch checkedChildren="已锁定" unCheckedChildren="未锁定" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={save} loading={saving}>
                保存设置
              </Button>
              <span style={{ color: '#888' }}>
                上次更新：{new Date(settings.updatedAt).toLocaleString()}
              </span>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
