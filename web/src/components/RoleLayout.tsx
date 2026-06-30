import { useEffect, useMemo, useState } from 'react';
import { Layout, Menu, Button, Typography, Space, Tag, Badge } from 'antd';
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
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { messageApi } from '@/api';
import { Role, RoleLabels } from '@shared/enums';
import type { ItemType } from 'antd/es/menu/interface';

const { Header, Sider, Content } = Layout;

function msgLabel(unread: number) {
  return (
    <Badge count={unread} size="small" offset={[8, 0]}>
      <span>消息</span>
    </Badge>
  );
}

function menuItems(role: Role, unread: number): ItemType[] {
  switch (role) {
    case Role.STUDENT:
      return [
        { key: '/student', icon: <SearchOutlined />, label: '浏览课题' },
        { key: '/student/favorites', icon: <StarOutlined />, label: '我的收藏' },
        { key: '/student/applications', icon: <FileTextOutlined />, label: '我的申请' },
        { key: '/student/messages', icon: <MessageOutlined />, label: msgLabel(unread) },
        { key: '/student/profile', icon: <UserOutlined />, label: '个人档案' },
      ];
    case Role.TEACHER:
      return [
        { key: '/teacher', icon: <BookOutlined />, label: '我的课题' },
        { key: '/teacher/applications', icon: <SolutionOutlined />, label: '申请管理' },
        { key: '/teacher/messages', icon: <MessageOutlined />, label: msgLabel(unread) },
      ];
    case Role.ADMIN:
      return [
        { key: '/admin', icon: <DashboardOutlined />, label: '系统概览' },
        { key: '/admin/users', icon: <TeamOutlined />, label: '用户管理' },
        { key: '/admin/topics', icon: <BookOutlined />, label: '课题总览' },
        { key: '/admin/assignments', icon: <CheckCircleOutlined />, label: '选题结果' },
        { key: '/admin/settings', icon: <SettingOutlined />, label: '系统设置' },
      ];
    default:
      return [];
  }
}

export default function RoleLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  // 教师/学生：每 30s 轮询未读数（管理员无站内信）
  const canMsg = user?.role === Role.TEACHER || user?.role === Role.STUDENT;
  useEffect(() => {
    if (!canMsg) return;
    const tick = () => messageApi.unreadCount().then((r) => setUnread(r.count)).catch(() => undefined);
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [canMsg]);

  const items = useMemo(() => menuItems(user!.role, unread), [user!.role, unread]);

  // 选中态：取当前路径中与菜单 key 的最长前缀匹配
  const selectedKey =
    items
      ?.map((i) => (i as { key: string }).key)
      .filter((k) => location.pathname.startsWith(k))
      .sort((a, b) => b.length - a.length)[0] ?? '';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible breakpoint="lg" theme="dark">
        <div
          style={{
            height: 56,
            color: '#fff',
            textAlign: 'center',
            lineHeight: '56px',
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          毕业设计选题系统
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
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography.Title level={4} style={{ margin: 0 }}>
            {items?.find((i) => (i as { key: string }).key === selectedKey)
              ? String(
                  (items?.find(
                    (i) => (i as { key: string }).key === selectedKey,
                  ) as { label: string })?.label,
                )
              : '首页'}
          </Typography.Title>
          <Space>
            <span>{user?.name}</span>
            <Tag color="blue">{user ? RoleLabels[user.role] : ''}</Tag>
            <Button
              icon={<LogoutOutlined />}
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              退出
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
