import { useState } from 'react';
import { Card, Form, Input, Button, Typography, Space, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { homePath } from '@/components/ProtectedRoute';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface LoginForm {
  username: string;
  password: string;
}

export default function Login() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      const user = await login(values.username, values.password);
      message.success(t('login.welcome', { name: user.name }));
      navigate(homePath(user.role), { replace: true });
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const quick = (username: string) => () =>
    onFinish({ username, password: '123456' });

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <LanguageSwitcher />
      </div>
      <Card style={{ width: 400, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 8 }}>
          {t('login.title')}
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>
          {t('login.subtitle')}
        </Typography.Paragraph>

        <Form layout="vertical" onFinish={onFinish} initialValues={{ username: '', password: '' }}>
          <Form.Item name="username" label={t('login.username')} rules={[{ required: true, message: t('common.required') }]}>
            <Input prefix={<UserOutlined />} placeholder={t('login.usernamePlaceholder')} size="large" />
          </Form.Item>
          <Form.Item name="password" label={t('login.password')} rules={[{ required: true, message: t('common.required') }]}>
            <Input.Password prefix={<LockOutlined />} placeholder={t('login.passwordPlaceholder')} size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              {t('login.submit')}
            </Button>
          </Form.Item>
        </Form>

        <Typography.Paragraph style={{ textAlign: 'center', marginBottom: 4 }}>
          {t('login.demo')}
        </Typography.Paragraph>
        <Space wrap style={{ justifyContent: 'center', width: '100%' }}>
          {['admin', 'teacher1', 'student1'].map((u) => (
            <Button key={u} size="small" onClick={quick(u)}>
              {u}
            </Button>
          ))}
        </Space>
      </Card>
    </div>
  );
}
