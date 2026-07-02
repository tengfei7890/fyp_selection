import { useEffect, useMemo, useState } from 'react';
import { Layout, Menu, Button, Typography, Space, Tag, Badge } from 'antd';
import type { TFunction } from 'i18next';
import {
  SearchOutlined,
  StarOutlined,
  FileTextOutlined,
  UserOutlined,
  BookOutlined,
  SolutionOutlined,
  DashboardOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  CheckCircleOutlined,
  MessageOutlined,
  BellOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { messageApi, notificationApi } from '@/api';
import { Role } from '@shared/enums';
import type { ItemType } from 'antd/es/menu/interface';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const { Header, Sider, Content } = Layout;

function msgLabel(unread: number, t: TFunction) {
  return (
    <span>
      {t('nav.messages')}
      {unread > 0 && <Badge count={unread} size="small" style={{ marginLeft: 6 }} />}
    </span>
  );
}

function menuItems(role: Role, unread: number, t: TFunction): ItemType[] {
  switch (role) {
    case Role.STUDENT:
      return [
        { key: '/student', icon: <SearchOutlined />, label: t('nav.browse') },
        { key: '/student/favorites', icon: <StarOutlined />, label: t('nav.favorites') },
        { key: '/student/applications', icon: <FileTextOutlined />, label: t('nav.applications') },
        { key: '/student/messages', icon: <MessageOutlined />, label: msgLabel(unread, t) },
        { key: '/student/profile', icon: <UserOutlined />, label: t('nav.profile') },
      ];
    case Role.TEACHER:
      return [
        { key: '/teacher', icon: <BookOutlined />, label: t('nav.myTopics') },
        { key: '/teacher/applications', icon: <SolutionOutlined />, label: t('nav.teacherApps') },
        { key: '/teacher/messages', icon: <MessageOutlined />, label: msgLabel(unread, t) },
      ];
    case Role.ADMIN:
      return [
        { key: '/admin', icon: <DashboardOutlined />, label: t('nav.dashboard') },
        { key: '/admin/users', icon: <TeamOutlined />, label: t('nav.users') },
        { key: '/admin/topics', icon: <BookOutlined />, label: t('nav.topics') },
        { key: '/admin/assignments', icon: <CheckCircleOutlined />, label: t('nav.assignments') },
        { key: '/admin/audit', icon: <FileSearchOutlined />, label: t('nav.audit') },
        { key: '/admin/settings', icon: <SettingOutlined />, label: t('nav.settings') },
      ];
    default:
      return [];
  }
}

export default function RoleLayout() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  const canMsg = user?.role === Role.TEACHER || user?.role === Role.STUDENT;
  useEffect(() => {
    if (!canMsg) return;
    const tick = () => messageApi.unreadCount().then((r) => setUnread(r.count)).catch(() => undefined);
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [canMsg]);

  useEffect(() => {
    const tick = () => notificationApi.unreadCount().then((r) => setNotifUnread(r.count)).catch(() => undefined);
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const items = useMemo(
    () => menuItems(user!.role, unread, t),
    [user!.role, unread, t],
  );

  const headerTitle =
    user!.role === Role.ADMIN
      ? t('nav.titleAdmin')
      : user!.role === Role.TEACHER
        ? t('nav.titleTeacher')
        : t('nav.titleStudent');

  const selectedKey =
    items
      ?.map((i) => (i as { key: string }).key)
      .filter((k) => location.pathname.startsWith(k))
      .sort((a, b) => b.length - a.length)[0] ?? '';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        theme="dark"
        style={{ overflow: 'hidden' }}
      >
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 600,
            fontSize: collapsed ? 18 : 15,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {collapsed ? t('nav.brandShort') : t('nav.brand')}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKey ? [selectedKey] : []}
          items={items}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Typography.Title
            level={4}
            style={{
              margin: 0,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {headerTitle}
          </Typography.Title>
          <Space size="middle" style={{ flexShrink: 0 }}>
            <LanguageSwitcher />
            <Badge count={notifUnread} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                onClick={() => navigate(`/${user!.role.toLowerCase()}/notifications`)}
              />
            </Badge>
            <span style={{ whiteSpace: 'nowrap' }}>{user?.name}</span>
            <Tag color="blue">{user ? t('role.' + user.role) : ''}</Tag>
            <Button
              icon={<LogoutOutlined />}
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              {t('nav.logout')}
            </Button>
          </Space>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
