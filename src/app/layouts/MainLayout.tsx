import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, BedDouble, UserCircle, Settings, CalendarRange, LayoutGrid,
  UtensilsCrossed, Receipt, Banknote, PieChart, ClipboardList, AlertCircle, PartyPopper,
  ShieldCheck, UserCog, LogOut, Bell, Search
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export function MainLayout() {
  const { role, user } = useAuthStore();

  const handleSignOut = () => {
    signOut(auth);
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Reports', path: '/reports', icon: PieChart },
    { name: 'Room Board', path: '/room-board', icon: LayoutGrid },
    { name: 'Stays', path: '/stays', icon: CalendarRange },
    { name: 'Pending Dues', path: '/pending-dues', icon: AlertCircle },
    { name: 'Restaurant POS', path: '/restaurant-pos', icon: UtensilsCrossed },
    { name: 'Banquet', path: '/banquet', icon: PartyPopper },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Rooms', path: '/rooms', icon: BedDouble },
    { name: 'Employees', path: '/employees', icon: UserCircle },
    { name: 'Attendance', path: '/attendance', icon: ClipboardList },
    { name: 'Expenses', path: '/expenses', icon: Receipt },
    { name: 'Payroll', path: '/payroll', icon: Banknote },
    { name: 'Settings', path: '/settings', icon: Settings },
    ...(role === 'admin' || role === 'manager' ? [
      { name: 'Team & Logins', path: '/team', icon: UserCog },
    ] : []),
    ...(role === 'admin' ? [
      { name: 'Audit Log', path: '/audit-log', icon: ShieldCheck },
    ] : []),
  ];

  return (
    <div className="flex h-screen bg-[#f4f7f6]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shadow-sm z-10">
        <div className="h-20 flex items-center px-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-400 rounded-md flex items-center justify-center text-white font-bold shadow-sm">
              G
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 leading-tight">Hotel GSR</h2>
              <p className="text-xs text-gray-500 font-medium">{role === 'admin' ? 'Admin Panel' : 'Staff Panel'}</p>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-2">
          <p className="text-xs font-semibold text-gray-400 tracking-wider">MENU</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 space-y-1 pb-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center space-x-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors duration-200',
                  isActive
                    ? 'bg-[#dcfce7] text-[#059669]'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-50">
          <button 
            onClick={handleSignOut}
            className="flex items-center space-x-3 text-gray-500 hover:text-gray-900 px-4 py-2.5 w-full text-sm font-medium rounded-full hover:bg-gray-50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-24 px-8 py-6 flex items-center justify-between gap-6">
          <div className="flex-1 max-w-4xl relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search anything..." 
              className="w-full pl-12 pr-4 py-3 bg-white border-none rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/20 text-gray-700 placeholder-gray-400"
            />
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative p-2.5 bg-white rounded-full shadow-sm text-gray-500 hover:text-gray-700 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            
            <div className="flex items-center gap-3 bg-white py-1.5 pl-1.5 pr-4 rounded-full shadow-sm">
              <div className="w-9 h-9 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-bold">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-800 leading-none">{user?.displayName || 'User'}</span>
                <span className="text-xs text-gray-500 mt-1">{user?.email}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto px-8 pb-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
