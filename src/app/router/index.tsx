import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { CustomersPage } from '@/features/customers/CustomersPage';
import { RoomsPage } from '@/features/rooms/RoomsPage';
import { EmployeesPage } from '@/features/employees/EmployeesPage';
import { SettingsPage } from '@/features/admin/SettingsPage';
import { TeamPage } from '@/features/admin/TeamPage';
import { AuditLogPage } from '@/features/admin/AuditLogPage';
import { StaysPage } from '@/features/stays/StaysPage';
import { RoomBoard } from '@/features/stays/RoomBoard';
import { FolioView } from '@/features/stays/FolioView';
import { PendingDuesPage } from '@/features/stays/PendingDuesPage';
import { POSView } from '@/features/restaurant/POSView';
import { BanquetPage } from '@/features/restaurant/BanquetPage';
import { ExpensesPage } from '@/features/accounts/ExpensesPage';
import { PayrollPage } from '@/features/hr/PayrollPage';
import { AttendancePage } from '@/features/hr/AttendancePage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
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
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'restaurant-pos',
        element: <POSView />,
      },
      {
        path: 'banquet',
        element: <BanquetPage />,
      },
      {
        path: 'stays',
        element: <StaysPage />,
      },
      {
        path: 'stays/:stayId',
        element: <FolioView />,
      },
      {
        path: 'pending-dues',
        element: <PendingDuesPage />,
      },
      {
        path: 'room-board',
        element: <RoomBoard />,
      },
      {
        path: 'customers',
        element: <CustomersPage />,
      },
      {
        path: 'rooms',
        element: <RoomsPage />,
      },
      {
        path: 'employees',
        element: <EmployeesPage />,
      },
      {
        path: 'attendance',
        element: <AttendancePage />,
      },
      {
        path: 'team',
        element: (
          <AdminRoute allowedRoles={['admin', 'manager']}>
            <TeamPage />
          </AdminRoute>
        ),
      },
      {
        path: 'audit-log',
        element: (
          <AdminRoute>
            <AuditLogPage />
          </AdminRoute>
        ),
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'expenses',
        element: <ExpensesPage />,
      },
      {
        path: 'payroll',
        element: <PayrollPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
    ],
  },
]);
