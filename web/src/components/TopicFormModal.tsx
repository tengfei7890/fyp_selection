import { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Space, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { topicApi, type TopicInput } from '@/api';
import type { Topic, Skill } from '@/types';
import {
  SelectionMode,
  TopicStatus,
} from '@shared/enums';

interface Props {
  open: boolean;
  topic: Topic | null;
  skills: Skill[];
  onClose: () => void;
  onSaved: () => void;
}

export default function TopicFormModal({ open, topic, skills, onClose, onSaved }: Props) {
  const { t } = useTranslation();
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
      return;
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
        message.success(t('common.updated'));
      } else {
        await topicApi.create(payload);
        message.success(t('common.created'));
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
      title={topic ? t('myTopics.editTitle') : t('myTopics.createTitle')}
      open={open}
      onOk={submit}
      onCancel={onClose}
      confirmLoading={saving}
      width={640}
      okText={t('common.save')}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item label={t('myTopics.fTitle')} name="title" rules={[{ required: true, message: t('myTopics.requireTitle') }]}>
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item label={t('myTopics.fDesc')} name="description" rules={[{ required: true, message: t('myTopics.requireDesc') }]}>
          <Input.TextArea rows={4} maxLength={2000} />
        </Form.Item>
        <Space wrap>
          <Form.Item label={t('myTopics.fMode')} name="selectionMode" style={{ width: 160 }}>
            <Select options={Object.values(SelectionMode).map((m) => ({ label: t('selectionMode.' + m), value: m }))} />
          </Form.Item>
          <Form.Item label={t('myTopics.fCapacity')} name="capacity" rules={[{ required: true }]} style={{ width: 140 }}>
            <InputNumber min={1} max={20} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label={t('myTopics.fStatus')} name="status" style={{ width: 140 }}>
            <Select options={Object.values(TopicStatus).map((s) => ({ label: t('topicStatus.' + s), value: s }))} />
          </Form.Item>
        </Space>
        <Space wrap>
          <Form.Item label={t('myTopics.fGpa')} name="gpaThreshold" style={{ width: 200 }}>
            <InputNumber min={0} max={5} step={0.1} style={{ width: '100%' }} placeholder={t('myTopics.fGpaPlaceholder')} />
          </Form.Item>
          <Form.Item label={t('myTopics.fYear')} name="academicYear" style={{ width: 200 }}>
            <Input placeholder={t('myTopics.fYearPlaceholder')} />
          </Form.Item>
        </Space>
        <Form.Item label={t('myTopics.fMajor')} name="majorRestriction">
          <Input placeholder={t('myTopics.fMajorPlaceholder')} />
        </Form.Item>
        <Form.Item label={t('myTopics.fSkills')} name="skillIds">
          <Select
            mode="multiple"
            placeholder={t('myTopics.fSkillsPlaceholder')}
            optionFilterProp="label"
            options={skills.map((s) => ({ label: s.name, value: s.id }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
