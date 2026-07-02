import { useEffect, useState, useCallback } from 'react';
import { Modal, Input, Table, Empty, message } from 'antd';
import { useTranslation } from 'react-i18next';
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

export default function RecipientPickerModal({ open, onClose, onConfirm }: Props) {
  const { t } = useTranslation();
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
          setItems(await userApi.searchTeachers(value));
        } else {
          setItems(await userApi.searchStudents(value));
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
    <Modal title={t('messages.pickTitle')} open={open} onCancel={onClose} footer={null} width={560} destroyOnClose>
      <Input.Search
        placeholder={isStudent ? t('messages.pickSearchTeacher') : t('messages.pickSearchStudent')}
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
        locale={{ emptyText: <Empty description={t('common.none')} /> }}
        onRow={(record) => ({
          onClick: () => onConfirm({ id: record.id, name: record.name }),
          style: { cursor: 'pointer' },
        })}
        columns={[
          { title: isStudent ? t('messages.pickTeacherCol') : t('messages.pickStudentCol'), dataIndex: 'name' },
          { title: t('messages.pickUsername'), dataIndex: 'username' },
          ...(isStudent
            ? []
            : [
                {
                  title: t('adminAssignments.colMajor'),
                  render: (_: unknown, r: Recipient) => r.studentProfile?.major ?? '-',
                },
              ]),
        ]}
      />
      <p style={{ color: '#888', marginTop: 8, marginBottom: 0 }}>{t('messages.pickHint')}</p>
    </Modal>
  );
}
