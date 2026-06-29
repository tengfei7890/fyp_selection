import { useEffect, useState } from 'react';
import { Card, Form, Input, InputNumber, Select, Button, message, Spin } from 'antd';
import { skillApi, userApi } from '@/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Skill } from '@/types';

export default function MyProfile() {
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
      message.success('档案已保存');
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spin style={{ display: 'block', marginTop: 80 }} />;

  return (
    <div className="page-container">
      <Card title="个人档案" style={{ maxWidth: 720 }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item label="学号" name="studentNo" rules={[{ required: true, message: '请输入学号' }]}>
            <Input placeholder="如 2022001" />
          </Form.Item>
          <Form.Item label="专业" name="major" rules={[{ required: true, message: '请输入专业' }]}>
            <Input placeholder="如 计算机科学与技术" />
          </Form.Item>
          <Form.Item label="年级" name="grade">
            <Input placeholder="如 2022" />
          </Form.Item>
          <Form.Item label="平均成绩（GPA，0-5）" name="gpa">
            <InputNumber min={0} max={5} step={0.1} style={{ width: '100%' }} placeholder="如 3.8" />
          </Form.Item>
          <Form.Item label="技能库（可多选）" name="skillIds">
            <Select
              mode="multiple"
              placeholder="选择你掌握的技能"
              optionFilterProp="label"
              options={skills.map((s) => ({ label: `${s.name}${s.category ? `（${s.category}）` : ''}`, value: s.id }))}
            />
          </Form.Item>
          <Form.Item label="个人简介" name="bio">
            <Input.TextArea rows={4} maxLength={500} placeholder="简短介绍你的背景、项目经历等" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>
              保存档案
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
