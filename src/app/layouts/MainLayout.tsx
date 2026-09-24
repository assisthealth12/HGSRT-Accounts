import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, BedDouble, UserCircle, Settings, CalendarRange, LayoutGrid, UtensilsCrossed, Receipt, Banknote, PieChart } from 'lucide-react';

export function MainLayout() {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Reports', path: '/reports', icon: PieChart },
    { name: 'Room Board', path: '/room-board', icon: LayoutGrid },
    { name: 'Stays', path: '/stays', icon: CalendarRange },
    { name: 'Restaurant POS', path: '/restaurant-pos', icon: UtensilsCrossed },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Rooms', path: '/rooms', icon: BedDouble },
    { name: 'Employees', path: '/employees', icon: UserCircle },
    { name: 'Expenses', path: '/expenses', icon: Receipt },
    { name: 'Payroll', path: '/payroll', icon: Banknote },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card text-card-foreground">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Hotel GSR</h2>
        </div>
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted hover:text-foreground text-muted-foreground'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b bg-card flex items-center px-6">
          <h1 className="text-lg font-medium">Dashboard</h1>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
