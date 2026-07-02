import { useEffect, useState } from 'react';
import { Card, Form, Switch, Select, Button, Alert, Space, message, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/api';
import type { SystemSettings } from '@/types';
import { SystemPhase } from '@shared/enums';

export default function AdminSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    adminApi.getSettings().then((s) => {
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
      message.success(t('common.updated'));
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <Spin style={{ display: 'block', marginTop: 80 }} />;

  return (
    <div className="page-container">
      <Card title={t('adminSettings.title')} style={{ maxWidth: 640 }}>
        <Alert style={{ marginBottom: 24 }} type="warning" showIcon message={t('adminSettings.warn')} />
        <Form form={form} layout="vertical">
          <Form.Item label={t('adminSettings.phase')} name="phase">
            <Select
              options={Object.values(SystemPhase).map((p) => ({ label: t('systemPhase.' + p), value: p }))}
            />
          </Form.Item>
          <Form.Item label={t('adminSettings.isLocked')} name="isLocked" valuePropName="checked">
            <Switch
              checkedChildren={t('adminSettings.locked')}
              unCheckedChildren={t('adminSettings.unlocked')}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={save} loading={saving}>
                {t('adminSettings.save')}
              </Button>
              <span style={{ color: '#888' }}>
                {t('adminSettings.lastUpdated', { time: new Date(settings.updatedAt).toLocaleString() })}
              </span>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
