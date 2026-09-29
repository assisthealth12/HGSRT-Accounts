import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, BedDouble, AlertCircle, UtensilsCrossed, Users,
  ClipboardList, Wallet, Receipt, Settings, UserCog, ShieldCheck, LogOut, Hotel, PartyPopper
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function MainLayout() {
  const role = useAuthStore((state) => state.role);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const groups: NavGroup[] = [
    {
      label: 'Overview',
      items: [{ name: 'Dashboard', path: '/', icon: LayoutDashboard }],
    },
    {
      label: 'Rooms & Bookings',
      items: [
        { name: 'Guest Register', path: '/bookings', icon: BedDouble },
        { name: 'Pending Dues', path: '/pending-dues', icon: AlertCircle },
      ],
    },
    {
      label: 'F&B Operations',
      items: [
        { name: 'Restaurant Sales', path: '/restaurant', icon: UtensilsCrossed },
        { name: 'Banquet Sales', path: '/banquet', icon: PartyPopper },
      ],
    },
    {
      label: 'Staff',
      items: [
        { name: 'Staff Roster', path: '/staff', icon: Users },
        { name: 'Attendance & Payroll', path: '/attendance', icon: ClipboardList },
      ],
    },
    {
      label: 'Accounts',
      items: [{ name: 'Expenses', path: '/expenses', icon: Receipt }],
    },
    {
      label: 'Admin',
      items: [
        { name: 'Settings', path: '/settings', icon: Settings },
        ...(role === 'admin' ? [
          { name: 'Team & Logins', path: '/team', icon: UserCog },
          { name: 'Audit Log', path: '/audit-log', icon: ShieldCheck },
        ] : []),
      ],
    },
  ];

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      <aside className="w-72 bg-white flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 border-r border-gray-100">
        <div className="h-24 px-6 flex items-center gap-4 bg-white border-b border-gray-50">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100 overflow-hidden">
            <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Hotel GSR</h2>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest">Management</p>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8 custom-scrollbar">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="px-4 mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200',
                        isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'hover:bg-gray-50 hover:text-gray-900 text-gray-500'
                      )
                    }
                  >
                    <item.icon className={cn("h-5 w-5")} />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 bg-gray-50/50 mt-auto border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-200 shadow-sm">
              <UserCog className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-700 truncate">{user?.email}</p>
              <p className="text-xs font-medium text-gray-500 capitalize">{role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-3 text-sm font-bold text-gray-600 bg-white hover:bg-gray-100 hover:text-gray-900 transition-all border border-gray-200 shadow-sm"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative bg-[#f8fafc]">
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-end px-8 shadow-sm shrink-0">
          <button 
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 hover:bg-gray-50 px-4 py-2 rounded-full transition-colors border border-transparent hover:border-gray-200"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-sm font-bold text-gray-700 block">My Profile</span>
              <span className="text-xs font-medium text-gray-400">Security Settings</span>
            </div>
          </button>
        </header>
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
