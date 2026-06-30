import { useEffect, useState, useCallback } from 'react';
import { Modal, Input, Table, Empty, message } from 'antd';
import { userApi } from '@/api';
import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@shared/enums';

interface Recipient {
  id: number;
  name: string;
  username: string;
  studentProfile?: { major?: string | null } | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (recipient: { id: number; name: string }) => void;
}

/** 发起新对话的收件人选择：学生选教师、教师选学生。 */
export default function RecipientPickerModal({ open, onClose, onConfirm }: Props) {
  const { user } = useAuth();
  const isStudent = user?.role === Role.STUDENT;
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(
    async (value: string) => {
      setLoading(true);
      try {
        if (isStudent) {
          const r = await userApi.searchTeachers(value);
          setItems(r);
        } else {
          const r = await userApi.searchStudents(value);
          setItems(r);
        }
      } catch (err) {
        message.error((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [isStudent],
  );

  useEffect(() => {
    if (open) {
      setQ('');
      search('');
    }
  }, [open, search]);

  return (
    <Modal
      title="发起新对话"
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      destroyOnClose
    >
      <Input.Search
        placeholder={isStudent ? '搜索教师姓名 / 用户名' : '搜索学生姓名 / 学号'}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onSearch={(v) => search(v)}
        allowClear
        style={{ marginBottom: 12 }}
      />
      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        size="small"
        pagination={{ pageSize: 6 }}
        scroll={{ y: 280 }}
        locale={{ emptyText: <Empty description="没有可选对象" /> }}
        onRow={(record) => ({
          onClick: () => onConfirm({ id: record.id, name: record.name }),
          style: { cursor: 'pointer' },
        })}
        columns={[
          { title: isStudent ? '教师' : '学生', dataIndex: 'name' },
          { title: '用户名', dataIndex: 'username' },
          ...(isStudent
            ? []
            : [
                {
                  title: '专业',
                  render: (_: unknown, r: Recipient) => r.studentProfile?.major ?? '-',
                },
              ]),
        ]}
      />
      <p style={{ color: '#888', marginTop: 8, marginBottom: 0 }}>点击任意一行即可发起对话。</p>
    </Modal>
  );
}
