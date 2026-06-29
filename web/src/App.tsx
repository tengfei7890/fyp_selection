import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, FullScreenLoading } from '@/contexts/AuthContext';
import { ProtectedRoute, homePath } from '@/components/ProtectedRoute';
import RoleLayout from '@/components/RoleLayout';
import { Role } from '@shared/enums';

import Login from '@/pages/Login';
import Browse from '@/pages/student/Browse';
import TopicDetail from '@/pages/student/TopicDetail';
import Favorites from '@/pages/student/Favorites';
import MyApplications from '@/pages/student/MyApplications';
import MyProfile from '@/pages/student/MyProfile';
import MyTopics from '@/pages/teacher/MyTopics';
import TeacherApplications from '@/pages/teacher/TeacherApplications';
import Dashboard from '@/pages/admin/Dashboard';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminTopics from '@/pages/admin/AdminTopics';
import AdminSettings from '@/pages/admin/AdminSettings';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homePath(user.role)} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RootRedirect />} />

          {/* 学生 */}
          <Route
            path="/student"
            element={
              <ProtectedRoute roles={[Role.STUDENT]}>
                <RoleLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Browse />} />
            <Route path="topics/:id" element={<TopicDetail />} />
            <Route path="favorites" element={<Favorites />} />
            <Route path="applications" element={<MyApplications />} />
            <Route path="profile" element={<MyProfile />} />
          </Route>

          {/* 教师 */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute roles={[Role.TEACHER]}>
                <RoleLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<MyTopics />} />
            <Route path="applications" element={<TeacherApplications />} />
          </Route>

          {/* 管理员 */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={[Role.ADMIN]}>
                <RoleLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="topics" element={<AdminTopics />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
