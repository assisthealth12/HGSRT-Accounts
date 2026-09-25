import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((state) => state.role);

  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
