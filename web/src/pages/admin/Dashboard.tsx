import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Spin, Alert } from 'antd';
import {
  TeamOutlined,
  BookOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/api';
import type { AdminStats } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .stats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin style={{ display: 'block', marginTop: 80 }} />;

  return (
    <div>
      <Alert
        style={{ marginBottom: 16 }}
        type="info"
        showIcon
        message={t('dashboard.welcome', { name: user?.name ?? '' })}
      />
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title={t('dashboard.users')} value={stats?.users ?? 0} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title={t('dashboard.students')} value={stats?.students ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title={t('dashboard.topics')} value={stats?.topics ?? 0} prefix={<BookOutlined />} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title={t('dashboard.openTopics')} value={stats?.openTopics ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title={t('dashboard.applications')} value={stats?.applications ?? 0} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title={t('dashboard.assignments')} value={stats?.assignments ?? 0} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title={t('dashboard.unassigned')} value={stats?.unassignedStudents ?? 0} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
