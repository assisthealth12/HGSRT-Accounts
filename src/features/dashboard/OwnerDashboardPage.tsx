import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatINR } from '@/domain/money';
import { bookingTotal, bookingPending } from '@/domain/booking';
import { totalBooked as restaurantBooked, totalCollected as restaurantCollected } from '@/domain/restaurantDailySales';
import { balanceOwed } from '@/domain/payrollPayment';
import { useBookingsInRange } from '@/hooks/useBookings';
import { usePaymentsInRange } from '@/hooks/usePayments';
import { useRestaurantDailySales } from '@/hooks/useRestaurantDailySales';
import { useBanquetSales } from '@/hooks/useBanquetSales';
import { useBanquetBookings } from '@/hooks/useBanquetBookings';
import { banquetPending } from '@/domain/banquetBooking';
import { useExpenses } from '@/hooks/useExpenses';
import { useStaff } from '@/hooks/useStaff';
import { usePayrollPayments } from '@/hooks/usePayrollPayments';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { LayoutDashboard, IndianRupee, Wallet, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportDashboardToExcel } from '@/lib/exportToExcel';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function inRange(date: string, from: string, to: string) {
  return date >= from && date <= to;
}

export function OwnerDashboardPage() {
  const navigate = useNavigate();
  const [from, setFrom] = useState(firstOfMonthISO());
  const [to, setTo] = useState(todayISO());

  const { data: bookings = [] } = useBookingsInRange(from, to);
  const { data: payments = [] } = usePaymentsInRange(from, to);
  const { data: restaurantSales = [] } = useRestaurantDailySales();
  const { data: banquetSales = [] } = useBanquetSales();
  const { data: banquetBookings = [] } = useBanquetBookings();
  const { data: expenses = [] } = useExpenses();
  const { staff } = useStaff();
  const { data: payrollPayments = [] } = usePayrollPayments();

  const bookingsInRange = useMemo(() => bookings.filter(b => inRange(b.checkIn, from, to)), [bookings, from, to]);
  const paymentsByBooking = useMemo(() => {
    const map = new Map<string, typeof payments>();
    payments.forEach(p => map.set(p.bookingId, [...(map.get(p.bookingId) || []), p]));
    return map;
  }, [payments]);

  const roomRevenue = bookingsInRange.reduce((acc, b) => acc + bookingTotal(b), 0);
  const roomCollected = bookingsInRange.reduce((acc, b) => {
    const p = paymentsByBooking.get(b.id) || [];
    return acc + p.filter(x => inRange(x.paidOn, from, to)).reduce((s, x) => s + x.amount, 0);
  }, 0);
  const roomPending = bookingsInRange.reduce((acc, b) => acc + bookingPending(b, paymentsByBooking.get(b.id) || []), 0);

  const restaurantInRange = restaurantSales.filter(s => inRange(s.saleDate, from, to));
  const restaurantSalesTotal = restaurantInRange.reduce((acc, s) => acc + restaurantBooked(s.onlineAmount, s.cashAmount, s.pendingAmount), 0);
  const restaurantCollectedTotal = restaurantInRange.reduce((acc, s) => acc + restaurantCollected(s.onlineAmount, s.cashAmount), 0);
  const restaurantPending = restaurantInRange.reduce((acc, s) => acc + s.pendingAmount, 0);

  const banquetInRange = banquetSales.filter(s => inRange(s.saleDate, from, to));
  const banquetBookingsInRange = banquetBookings.filter(b => inRange(b.eventDate, from, to));
  const banquetSalesTotal = banquetInRange.reduce((acc, s) => acc + s.onlineAmount + s.cashAmount, 0) + 
                            banquetBookingsInRange.reduce((acc, b) => acc + b.quotedAmount, 0);
  
  const banquetCollectedTotal = banquetInRange.reduce((acc, s) => acc + s.onlineAmount + s.cashAmount, 0) +
                                banquetBookingsInRange.reduce((acc, b) => {
                                  const p = paymentsByBooking.get(b.id) || [];
                                  return acc + p.filter(x => inRange(x.paidOn, from, to)).reduce((s, x) => s + x.amount, 0);
                                }, 0);
  
  const banquetPendingAmount = banquetBookingsInRange.reduce((acc, b) => acc + banquetPending(b, paymentsByBooking.get(b.id) || []), 0);

  const totalGrossRevenue = roomRevenue + restaurantSalesTotal + banquetSalesTotal;
  const totalCollected = roomCollected + restaurantCollectedTotal + banquetCollectedTotal;
  const totalPayrollPaid = payrollPayments
    .filter(p => inRange(p.paidOn, from, to))
    .reduce((acc, p) => acc + p.amount, 0);

  const totalExpenditure = expenses
    .filter(e => inRange(e.paidOn, from, to))
    .reduce((acc, e) => acc + e.billAmount, 0) + totalPayrollPaid;
  const netProfit = totalGrossRevenue - totalExpenditure;
  const totalPending = roomPending + restaurantPending + banquetPendingAmount;

  const trendData = useMemo(() => {
    const dates: string[] = [];
    let cursor = new Date(from);
    const end = new Date(to);
    while (cursor <= end && dates.length < 62) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates.map(date => {
      const dayRoom = bookings.filter(b => b.checkIn === date).reduce((acc, b) => acc + bookingTotal(b), 0);
      const sale = restaurantSales.find(s => s.saleDate === date);
      const dayRestaurant = sale ? restaurantBooked(sale.onlineAmount, sale.cashAmount, sale.pendingAmount) : 0;
      const dayBanquetSales = banquetSales.find(s => s.saleDate === date);
      const dayBanquetEvents = banquetBookings.filter(b => b.eventDate === date).reduce((acc, b) => acc + b.quotedAmount, 0);
      const dayBanquet = (dayBanquetSales ? dayBanquetSales.onlineAmount + dayBanquetSales.cashAmount : 0) + dayBanquetEvents;
      const totalRev = dayRoom + dayRestaurant + dayBanquet;
      
      const d = new Date(date);
      const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { 
        rawDate: date,
        date: formattedDate,
        Revenue: totalRev / 100 
      };
    });
  }, [bookings, restaurantSales, banquetSales, from, to]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Owner Dashboard"
        description="Live figures only — nothing on this page is typed in."
        actions={
          <div className="flex gap-3">
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                className="gap-2 font-semibold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 border-emerald-200"
                onClick={() => exportDashboardToExcel({
                  from, to,
                  summary: {
                    roomRevenue, roomCollected, roomPending,
                    restaurantSalesTotal, restaurantCollectedTotal, restaurantPending,
                    banquetSalesTotal, banquetCollectedTotal,
                    totalGrossRevenue, totalCollected, totalExpenditure, netProfit
                  },
                  bookings: bookingsInRange,
                  restaurantSales: restaurantInRange,
                  banquetSales: banquetInRange,
                  expenses: expenses.filter(e => inRange(e.paidOn, from, to)),
                  staff,
                  payrollPayments
                })}
              >
                <Download className="w-4 h-4" />
                Export to Excel
              </Button>
            </div>
          </div>
        }
      />

      <div className="space-y-6">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gross Revenue Breakdown</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="Room Revenue" value={formatINR(roomRevenue)} colorTheme="blue" onClick={() => navigate('/bookings')} footerText="View Bookings" />
            <StatCard label="Restaurant Revenue" value={formatINR(restaurantSalesTotal)} colorTheme="blue" onClick={() => navigate('/restaurant')} footerText="View Restaurant" />
            <StatCard label="Banquet Revenue" value={formatINR(banquetSalesTotal)} colorTheme="blue" onClick={() => navigate('/banquet')} footerText="View Banquet" />
            <div className="col-span-1 md:col-span-1 rounded-2xl bg-blue-600 shadow-sm border border-blue-700/50 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              <div className="p-6 relative z-10">
                <div className="text-sm font-bold text-white/80 uppercase tracking-widest mb-1">Total Gross Revenue</div>
                <div className="text-3xl font-black text-white">{formatINR(totalGrossRevenue)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Collected Breakdown</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="Room Collected" value={formatINR(roomCollected)} colorTheme="green" onClick={() => navigate('/bookings')} footerText="View Bookings" />
            <StatCard label="Restaurant Collected" value={formatINR(restaurantCollectedTotal)} colorTheme="green" onClick={() => navigate('/restaurant')} footerText="View Restaurant" />
            <StatCard label="Banquet Collected" value={formatINR(banquetCollectedTotal)} colorTheme="green" onClick={() => navigate('/banquet')} footerText="View Banquet" />
            <div className="col-span-1 md:col-span-1 rounded-2xl bg-emerald-600 shadow-sm border border-emerald-700/50 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              <div className="p-6 relative z-10">
                <div className="text-sm font-bold text-white/80 uppercase tracking-widest mb-1">Total Collected</div>
                <div className="text-3xl font-black text-white">{formatINR(totalCollected)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending Dues</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="Room Pending" value={formatINR(roomPending)} colorTheme="orange" icon={AlertCircle} onClick={() => navigate('/pending-dues')} footerText="Clear Room Dues" />
            <StatCard label="Restaurant Pending" value={formatINR(restaurantPending)} colorTheme="pink" icon={AlertCircle} onClick={() => navigate('/restaurant')} footerText="Clear Restaurant Dues" />
            <StatCard label="Banquet Pending" value={formatINR(banquetPendingAmount)} colorTheme="purple" icon={AlertCircle} onClick={() => navigate('/banquet')} footerText="Clear Banquet Dues" />
            <div className="col-span-1 md:col-span-1 rounded-2xl bg-red-500 shadow-sm border border-red-600/50 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              <div className="p-6 relative z-10">
                <div className="text-sm font-bold text-white/80 uppercase tracking-widest mb-1">Total Pending</div>
                <div className="text-3xl font-black text-white flex items-center gap-2"><AlertCircle className="w-6 h-6 text-white/80" /> {formatINR(totalPending)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expenses & Profit</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="Operational Expenses" value={formatINR(totalExpenditure - totalPayrollPaid)} colorTheme="orange" onClick={() => navigate('/expenses')} footerText="View Expenses" />
            <StatCard label="Payroll Expenses" value={formatINR(totalPayrollPaid)} colorTheme="orange" onClick={() => navigate('/staff')} footerText="View Payroll" />
            <StatCard label="Total Expenditure" value={formatINR(totalExpenditure)} colorTheme="red" />
            <div className={`col-span-1 md:col-span-1 rounded-2xl shadow-sm border overflow-hidden relative ${netProfit >= 0 ? 'bg-emerald-600 border-emerald-700/50' : 'bg-red-600 border-red-700/50'}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              <div className="p-6 relative z-10">
                <div className="text-sm font-bold text-white/80 uppercase tracking-widest mb-1">Net Profit</div>
                <div className="text-3xl font-black text-white">{formatINR(netProfit)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="h-[400px]">
        <CardHeader>
          <CardTitle>Daily Gross Revenue</CardTitle>
          <CardDescription>{from} to {to}</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickMargin={10} 
                minTickGap={30}
              />
              <YAxis 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `₹${value.toLocaleString()}`}
                width={80}
              />
              <Tooltip 
                formatter={(value: number) => [`₹ ${value.toLocaleString()}`, 'Revenue']}
                labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
              />
              <Area 
                type="monotone" 
                dataKey="Revenue" 
                stroke="#2563eb" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorRev)" 
                activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
