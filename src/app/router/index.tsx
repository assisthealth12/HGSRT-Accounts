import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { RoomsPage } from '@/features/rooms/RoomsPage';
import { BookingsPage } from '@/features/bookings/BookingsPage';
import { PendingDuesPage } from '@/features/bookings/PendingDuesPage';
import { RestaurantSalesPage } from '@/features/restaurant/RestaurantSalesPage';
import { BanquetSalesPage } from '@/features/restaurant/BanquetSalesPage';
import { StaffPage } from '@/features/staff/StaffPage';
import { AttendancePage } from '@/features/staff/AttendancePage';
import { ExpensesPage } from '@/features/expenses/ExpensesPage';
import { OwnerDashboardPage } from '@/features/dashboard/OwnerDashboardPage';
import { SettingsPage } from '@/features/admin/SettingsPage';
import { TeamPage } from '@/features/admin/TeamPage';
import { AuditLogPage } from '@/features/admin/AuditLogPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { ProfilePage } from '@/features/admin/ProfilePage';
import { AuthLayout } from '../layouts/AuthLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminRoute } from '@/components/auth/AdminRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout />,
    children: [
      { index: true, element: <LoginPage /> }
    ]
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <OwnerDashboardPage /> },
      { path: 'bookings', element: <BookingsPage /> },
      { path: 'pending-dues', element: <PendingDuesPage /> },
      { path: 'restaurant', element: <RestaurantSalesPage /> },
      { path: 'banquet', element: <BanquetSalesPage /> },
      { path: 'staff', element: <StaffPage /> },
      { path: 'attendance', element: <AttendancePage /> },
      { path: 'expenses', element: <ExpensesPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'profile', element: <ProfilePage /> },
      {
        path: 'team',
        element: (
          <AdminRoute allowedRoles={['admin']}>
            <TeamPage />
          </AdminRoute>
        ),
      },
      {
        path: 'audit-log',
        element: (
          <AdminRoute allowedRoles={['admin']}>
            <AuditLogPage />
          </AdminRoute>
        ),
      },
    ],
  },
]);
