import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, FullScreenLoading } from '@/contexts/AuthContext';
import { Role } from '@shared/enums';

export function homePath(role: Role): string {
  switch (role) {
    case Role.ADMIN:
      return '/admin';
    case Role.TEACHER:
      return '/teacher';
    case Role.STUDENT:
    default:
      return '/student';
  }
}

export function ProtectedRoute({
  roles,
  children,
}: {
  roles?: Role[];
  children: ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homePath(user.role)} replace />;
  }
  return <>{children}</>;
}
