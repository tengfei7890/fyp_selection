import { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, message } from 'antd';
import { topicApi, type TopicInput } from '@/api';
import type { Topic, Skill } from '@/types';
import {
  SelectionMode,
  SelectionModeLabels,
  TopicStatus,
  TopicStatusLabels,
} from '@shared/enums';

interface Props {
  open: boolean;
  /** 传入课题=编辑；null=新建 */
  topic: Topic | null;
  skills: Skill[];
  onClose: () => void;
  onSaved: () => void;
}

/**
 * 课题新建/编辑表单弹窗（教师新建、教师/管理员编辑共用）。
 * 管理员编辑走 topicApi.update（后端已放行 ADMIN）。
 */
export default function TopicFormModal({
  open,
  topic,
  skills,
  onClose,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<TopicInput>();

  useEffect(() => {
    if (!open) return;
    if (topic) {
      form.setFieldsValue({
        title: topic.title,
        description: topic.description,
        capacity: topic.capacity,
        selectionMode: topic.selectionMode,
        status: topic.status,
        gpaThreshold: topic.gpaThreshold ?? undefined,
        majorRestriction: topic.majorRestriction ?? undefined,
        academicYear: topic.academicYear ?? undefined,
        skillIds: topic.requirements?.map((r) => r.skill.id) ?? [],
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        capacity: 1,
        selectionMode: SelectionMode.MUTUAL,
        status: TopicStatus.DRAFT,
        skillIds: [],
      });
    }
  }, [open, topic, form]);

  const submit = async () => {
    let values: TopicInput;
    try {
      values = await form.validateFields();
    } catch {
      return; // 字段校验失败，antd 已在字段下提示
    }
    setSaving(true);
    try {
      const payload: TopicInput = {
        ...values,
        gpaThreshold: values.gpaThreshold ?? null,
        majorRestriction: values.majorRestriction ?? null,
        academicYear: values.academicYear ?? null,
      };
      if (topic) {
        await topicApi.update(topic.id, payload);
        message.success('课题已更新');
      } else {
        await topicApi.create(payload);
        message.success('课题已创建');
      }
      onSaved();
      onClose();
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={topic ? '编辑课题' : '新建课题'}
      open={open}
      onOk={submit}
      onCancel={onClose}
      confirmLoading={saving}
      width={640}
      okText="保存"
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item label="课题标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item label="课题描述" name="description" rules={[{ required: true, message: '请输入描述' }]}>
          <Input.TextArea rows={4} maxLength={2000} />
        </Form.Item>
        <Form.Item label="选题模式" name="selectionMode">
          <Select options={Object.values(SelectionMode).map((m) => ({ label: SelectionModeLabels[m], value: m }))} />
        </Form.Item>
        <Form.Item label="容量（人数）" name="capacity" rules={[{ required: true }]}>
          <InputNumber min={1} max={20} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="状态" name="status">
          <Select options={Object.values(TopicStatus).map((s) => ({ label: TopicStatusLabels[s], value: s }))} />
        </Form.Item>
        <Form.Item label="GPA 阈值（0-5，留空不限）" name="gpaThreshold">
          <InputNumber min={0} max={5} step={0.1} style={{ width: '100%' }} placeholder="如 3.5" />
        </Form.Item>
        <Form.Item label="专业要求（逗号分隔，留空不限）" name="majorRestriction">
          <Input placeholder="如 计算机科学与技术,软件工程" />
        </Form.Item>
        <Form.Item label="学年" name="academicYear">
          <Input placeholder="如 2025-2026" />
        </Form.Item>
        <Form.Item label="技能要求（可多选）" name="skillIds">
          <Select
            mode="multiple"
            placeholder="选择课题要求的技能"
            optionFilterProp="label"
            options={skills.map((s) => ({ label: s.name, value: s.id }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
