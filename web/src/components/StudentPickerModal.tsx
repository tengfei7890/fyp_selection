import { useEffect, useState, useCallback } from 'react';
import { Modal, Input, Table, Empty, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { userApi } from '@/api';
import type { StudentSearchItem } from '@/types';

interface Props {
  open: boolean;
  excludeIds?: number[];
  onClose: () => void;
  onConfirm: (students: StudentSearchItem[]) => void;
}

export default function StudentPickerModal({ open, excludeIds = [], onClose, onConfirm }: Props) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<StudentSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<StudentSearchItem[]>([]);

  const search = useCallback(async (value: string) => {
    setLoading(true);
    try {
      setItems(await userApi.searchStudents(value));
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setSelected([]);
      setQ('');
      search('');
    }
  }, [open, search]);

  const visible = items.filter((s) => !excludeIds.includes(s.id));

  return (
    <Modal
      title={t('teacherApp.directPick')}
      open={open}
      onCancel={onClose}
      onOk={() => {
        if (selected.length === 0) {
          message.warning(t('adminAssignments.requireStudent'));
          return;
        }
        onConfirm(selected);
      }}
      width={640}
      okText={`${t('common.ok')}（${selected.length}）`}
      destroyOnClose
    >
      <Input.Search
        placeholder={t('adminAssignments.fStudentSearch')}
        allowClear
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onSearch={(v) => search(v)}
        style={{ marginBottom: 12 }}
      />
      <Table
        rowKey="id"
        loading={loading}
        dataSource={visible}
        size="small"
        pagination={{ pageSize: 6 }}
        scroll={{ y: 280 }}
        rowSelection={{
          selectedRowKeys: selected.map((s) => s.id),
          onChange: (keys) => setSelected(visible.filter((s) => keys.includes(s.id))),
        }}
        locale={{ emptyText: <Empty description={t('common.none')} /> }}
        columns={[
          { title: t('adminAssignments.colStudent'), dataIndex: 'name' },
          { title: t('profile.studentNo'), render: (_: unknown, r: StudentSearchItem) => r.studentProfile?.studentNo ?? '-' },
          { title: t('adminAssignments.colMajor'), render: (_: unknown, r: StudentSearchItem) => r.studentProfile?.major ?? '-' },
          { title: t('adminAssignments.colGpa'), width: 70, render: (_: unknown, r: StudentSearchItem) => r.studentProfile?.gpa ?? '-' },
        ]}
      />
    </Modal>
  );
}
