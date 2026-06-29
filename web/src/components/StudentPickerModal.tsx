import { useEffect, useState, useCallback } from 'react';
import { Modal, Input, Table, Empty, message } from 'antd';
import { userApi } from '@/api';
import type { StudentSearchItem } from '@/types';

interface Props {
  open: boolean;
  /** 已分配/已选中的学生 id，列表中排除 */
  excludeIds?: number[];
  onClose: () => void;
  onConfirm: (students: StudentSearchItem[]) => void;
}

/**
 * 学生搜索多选弹窗：用于教师"直接指定"与管理员改派。
 * 支持按姓名/用户名/学号搜索。
 */
export default function StudentPickerModal({
  open,
  excludeIds = [],
  onClose,
  onConfirm,
}: Props) {
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
      title="选择学生"
      open={open}
      onCancel={onClose}
      onOk={() => {
        if (selected.length === 0) {
          message.warning('请至少选择一名学生');
          return;
        }
        onConfirm(selected);
      }}
      width={640}
      okText={`确定（已选 ${selected.length}）`}
      destroyOnClose
    >
      <Input.Search
        placeholder="按姓名 / 用户名 / 学号搜索"
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
          onChange: (keys) =>
            setSelected(visible.filter((s) => keys.includes(s.id))),
        }}
        locale={{ emptyText: <Empty description="没有可选学生" /> }}
        columns={[
          { title: '姓名', dataIndex: 'name' },
          { title: '学号', render: (_: unknown, r: StudentSearchItem) => r.studentProfile?.studentNo ?? '-' },
          { title: '专业', render: (_: unknown, r: StudentSearchItem) => r.studentProfile?.major ?? '-' },
          { title: 'GPA', width: 70, render: (_: unknown, r: StudentSearchItem) => r.studentProfile?.gpa ?? '-' },
        ]}
      />
    </Modal>
  );
}
