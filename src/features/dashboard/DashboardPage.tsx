import React from 'react';
import { ArrowRight, BedDouble, UtensilsCrossed, Users, AlertCircle, PartyPopper, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStays } from '@/hooks/useStays';
import { useActiveStays } from '@/hooks/useActiveStays';
import { useRestaurantTables } from '@/hooks/useRestaurantTables';
import { useKots } from '@/hooks/useKots';
import { useAuthStore } from '@/store/authStore';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  actionText: string;
  onClick: () => void;
  colorClass: string;
  darkColorClass: string;
}

function StatCard({ title, value, icon: Icon, actionText, onClick, colorClass, darkColorClass }: StatCardProps) {
  return (
    <div 
      className={`rounded-xl overflow-hidden shadow-sm cursor-pointer transition-transform hover:-translate-y-1 ${colorClass} text-white`}
      onClick={onClick}
    >
      <div className="p-6 relative">
        <div className="flex justify-between items-start">
          <h3 className="text-sm font-semibold tracking-wider uppercase mb-4 opacity-90">{title}</h3>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="text-5xl font-bold">{value}</div>
      </div>
      <div className={`px-6 py-3 flex items-center justify-between text-sm font-medium ${darkColorClass}`}>
        <span>{actionText}</span>
        <ArrowRight className="w-4 h-4" />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: stays = [] } = useStays();
  const { data: activeStays = [] } = useActiveStays();
  const { data: tables = [] } = useRestaurantTables();
  const { data: kots = [] } = useKots();

  const today = todayISO();
  const arrivals = stays.filter(s => s.checkInDate === today && s.status !== 'Cancelled').length;
  // const departures = stays.filter(s => s.expectedCheckOutDate === today && s.status === 'In-House').length;

  const occupiedTables = tables.filter(t => t.status === 'Occupied').length;
  // const kotsToday = kots.filter(k => new Date(k.createdAt).toISOString().slice(0, 10) === today).length;

  const inHouseCount = activeStays.filter(s => s.status === 'In-House').length;
  // const reservedCount = activeStays.filter(s => s.status === 'Reserved').length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Overview</h2>
        <p className="text-gray-500 mt-1">Welcome back, {user?.email || 'User'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Front Desk"
          value={arrivals}
          icon={BedDouble}
          actionText="Room Board"
          onClick={() => navigate('/room-board')}
          colorClass="bg-[#3b82f6]" // blue-500
          darkColorClass="bg-[#2563eb]" // blue-600
        />
        
        <StatCard
          title="Restaurant"
          value={occupiedTables}
          icon={UtensilsCrossed}
          actionText="Open POS"
          onClick={() => navigate('/restaurant-pos')}
          colorClass="bg-[#8b5cf6]" // purple-500
          darkColorClass="bg-[#7c3aed]" // purple-600
        />
        
        <StatCard
          title="Guests"
          value={inHouseCount}
          icon={Users}
          actionText="View Directory"
          onClick={() => navigate('/customers')}
          colorClass="bg-[#f59e0b]" // amber-500
          darkColorClass="bg-[#d97706]" // amber-600
        />

        <StatCard
          title="Pending Dues"
          value="0"
          icon={AlertCircle}
          actionText="Review Dues"
          onClick={() => navigate('/pending-dues')}
          colorClass="bg-[#10b981]" // emerald-500
          darkColorClass="bg-[#059669]" // emerald-600
        />

        <StatCard
          title="Banquet"
          value="1"
          icon={PartyPopper}
          actionText="Manage Banquet"
          onClick={() => navigate('/banquet')}
          colorClass="bg-[#06b6d4]" // cyan-500
          darkColorClass="bg-[#0891b2]" // cyan-600
        />

        <StatCard
          title="Expenses"
          value="0"
          icon={Receipt}
          actionText="Review Expenses"
          onClick={() => navigate('/expenses')}
          colorClass="bg-[#ec4899]" // pink-500
          darkColorClass="bg-[#db2777]" // pink-600
        />
      </div>
    </div>
  );
}
