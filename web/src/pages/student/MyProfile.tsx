import { useEffect, useState } from 'react';
import { Card, Form, Input, InputNumber, Select, Button, message, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { skillApi, userApi } from '@/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Skill } from '@/types';

export default function MyProfile() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    (async () => {
      try {
        const allSkills = await skillApi.list();
        setSkills(allSkills);
        const p = user?.studentProfile;
        if (p) {
          form.setFieldsValue({
            studentNo: p.studentNo,
            major: p.major,
            gpa: p.gpa ?? undefined,
            grade: p.grade ?? undefined,
            bio: p.bio ?? undefined,
            skillIds: p.skills.map((s) => s.skillId),
          });
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFinish = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      const updated = await userApi.updateProfile({
        studentNo: values.studentNo as string,
        major: values.major as string,
        gpa: (values.gpa as number) ?? null,
        grade: (values.grade as string) || null,
        bio: (values.bio as string) || null,
        skillIds: (values.skillIds as number[]) ?? [],
      });
      setUser(updated);
      message.success(t('common.updated'));
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spin style={{ display: 'block', marginTop: 80 }} />;

  return (
    <div className="page-container">
      <Card title={t('profile.title')} style={{ maxWidth: 720 }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item label={t('profile.studentNo')} name="studentNo" rules={[{ required: true, message: t('profile.requireStudentNo') }]}>
            <Input placeholder={t('profile.studentNoPlaceholder')} />
          </Form.Item>
          <Form.Item label={t('profile.major')} name="major" rules={[{ required: true, message: t('profile.requireMajor') }]}>
            <Input placeholder={t('profile.majorPlaceholder')} />
          </Form.Item>
          <Form.Item label={t('profile.grade')} name="grade">
            <Input placeholder={t('profile.gradePlaceholder')} />
          </Form.Item>
          <Form.Item label={t('profile.gpa')} name="gpa">
            <InputNumber min={0} max={5} step={0.1} style={{ width: '100%' }} placeholder={t('profile.gpaPlaceholder')} />
          </Form.Item>
          <Form.Item label={t('profile.skills')} name="skillIds">
            <Select
              mode="multiple"
              placeholder={t('profile.skillsPlaceholder')}
              optionFilterProp="label"
              options={skills.map((s) => ({ label: `${s.name}${s.category ? `（${s.category}）` : ''}`, value: s.id }))}
            />
          </Form.Item>
          <Form.Item label={t('profile.bio')} name="bio">
            <Input.TextArea rows={4} maxLength={500} placeholder={t('profile.bioPlaceholder')} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>
              {t('profile.save')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
