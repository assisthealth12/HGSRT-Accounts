import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart as BarChartIcon, LineChart as LineChartIcon, PieChart as PieChartIcon, Download } from 'lucide-react';
import { formatINR } from '@/domain/money';
import { useCharges } from '@/hooks/useCharges';
import { useExpenses } from '@/hooks/useExpenses';
import { useRooms } from '@/hooks/useRooms';
import { useStays } from '@/hooks/useStays';
import { usePayments } from '@/hooks/usePayments';
import { useBanquetSales } from '@/hooks/useBanquetSales';
import { computeBalance } from '@/domain/folio';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

const PIE_COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626'];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function lastNDates(n: number) {
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7); // YYYY-MM
}

function lastNMonths(n: number) {
  const months: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ key, label: d.toLocaleString('default', { month: 'short' }) });
  }
  return months;
}

export function ReportsPage() {
  const navigate = useNavigate();
  const { data: charges = [], isLoading: isLoadingCharges } = useCharges();
  const { data: expenses = [], isLoading: isLoadingExpenses } = useExpenses();
  const { data: rooms = [] } = useRooms();
  const { data: stays = [] } = useStays();
  const { data: payments = [] } = usePayments();
  const { data: banquetSales = [] } = useBanquetSales();

  const isLoading = isLoadingCharges || isLoadingExpenses;

  const activeCharges = useMemo(() => charges.filter(c => !c.isVoided), [charges]);
  const today = todayISO();

  const dailyRoomRevenue = useMemo(
    () => activeCharges
      .filter(c => c.type === 'Room' && c.businessDate === today)
      .reduce((acc, c) => acc + c.totalAmount, 0),
    [activeCharges, today]
  );

  const dailyFnbRevenue = useMemo(
    () => activeCharges
      .filter(c => c.type === 'Restaurant' && c.businessDate === today)
      .reduce((acc, c) => acc + c.totalAmount, 0),
    [activeCharges, today]
  );

  const occupiedRooms = rooms.filter(r => r.status === 'Occupied').length;
  const occupancyRate = rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0;
  const revPAR = rooms.length > 0 ? Math.round(dailyRoomRevenue / rooms.length) : 0;

  const trendData = useMemo(() => {
    const days = lastNDates(7);
    return days.map(date => {
      const dayCharges = activeCharges.filter(c => c.businessDate === date);
      return {
        date: date.slice(5),
        Room: dayCharges.filter(c => c.type === 'Room').reduce((acc, c) => acc + c.totalAmount, 0) / 100,
        'F&B': dayCharges.filter(c => c.type === 'Restaurant').reduce((acc, c) => acc + c.totalAmount, 0) / 100,
      };
    });
  }, [activeCharges]);

  const sourceData = useMemo(() => {
    const stayById = new Map(stays.map(s => [s.id, s]));
    const totals = new Map<string, number>();

    activeCharges
      .filter(c => c.type === 'Room')
      .forEach(c => {
        const source = stayById.get(c.stayId)?.source || 'Unknown';
        totals.set(source, (totals.get(source) || 0) + c.totalAmount);
      });

    return Array.from(totals.entries()).map(([name, value]) => ({ name, value: value / 100 }));
  }, [activeCharges, stays]);

  const monthlyData = useMemo(() => {
    const months = lastNMonths(6);
    return months.map(({ key, label }) => {
      const revenue = activeCharges
        .filter(c => monthKey(c.businessDate) === key)
        .reduce((acc, c) => acc + c.totalAmount, 0);
      const expenseTotal = expenses
        .filter(e => monthKey(e.invoiceDate) === key)
        .reduce((acc, e) => acc + e.grandTotal, 0);
      return { month: label, Revenue: revenue / 100, Expenses: expenseTotal / 100 };
    });
  }, [activeCharges, expenses]);

  const banquetRevenue = useMemo(
    () => banquetSales.reduce((acc, s) => acc + s.onlineAmount + s.cashAmount, 0),
    [banquetSales]
  );

  const totalRevenue = useMemo(
    () => activeCharges.reduce((acc, c) => acc + c.totalAmount, 0) + banquetRevenue,
    [activeCharges, banquetRevenue]
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((acc, e) => acc + e.grandTotal, 0),
    [expenses]
  );

  const netProfit = totalRevenue - totalExpenses;

  const totalPendingDues = useMemo(() => {
    const chargesByStay = new Map<string, typeof charges>();
    activeCharges.forEach(c => {
      chargesByStay.set(c.stayId, [...(chargesByStay.get(c.stayId) || []), c]);
    });
    const paymentsByCustomer = new Map<string, typeof payments>();
    payments.filter(p => !p.isReversed).forEach(p => {
      paymentsByCustomer.set(p.customerId, [...(paymentsByCustomer.get(p.customerId) || []), p]);
    });

    return stays.reduce((acc, stay) => {
      const balance = computeBalance(chargesByStay.get(stay.id) || [], paymentsByCustomer.get(stay.customerId) || []);
      return acc + Math.max(balance, 0);
    }, 0);
  }, [stays, activeCharges, payments]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports & Analytics</h2>
          <p className="text-muted-foreground">
            Key performance indicators and financial summaries.
          </p>
        </div>
        <div className="space-x-2">
          <Button variant="outline"><Download className="w-4 h-4 mr-2"/> Export CSV</Button>
          <Button><Download className="w-4 h-4 mr-2"/> Download PDF Report</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Daily Revenue (Rooms)</CardTitle>
            <div className="text-2xl font-bold text-primary">{formatINR(dailyRoomRevenue)}</div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Daily Revenue (F&B)</CardTitle>
            <div className="text-2xl font-bold text-primary">{formatINR(dailyFnbRevenue)}</div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Occupancy Rate</CardTitle>
            <div className="text-2xl font-bold">{occupancyRate}%</div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">RevPAR</CardTitle>
            <div className="text-2xl font-bold">{formatINR(revPAR)}</div>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Banquet Revenue (All Time)</CardTitle>
            <div className="text-2xl font-bold text-primary">{formatINR(banquetRevenue)}</div>
          </CardHeader>
        </Card>
        <Card className={netProfit >= 0 ? 'border-success' : 'border-destructive'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Net Profit (All Time)</CardTitle>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{formatINR(netProfit)}</div>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/pending-dues')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Total Pending Dues</CardTitle>
            <div className="text-2xl font-bold text-destructive">{formatINR(totalPendingDues)}</div>
          </CardHeader>
        </Card>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading report data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="h-96">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChartIcon className="w-5 h-5 text-muted-foreground" />
                7-Day Revenue Trend
              </CardTitle>
              <CardDescription>Room vs F&B Revenue (₹)</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Room" stroke="#2563eb" strokeWidth={2} />
                  <Line type="monotone" dataKey="F&B" stroke="#16a34a" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="h-96">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-muted-foreground" />
                Revenue by Source
              </CardTitle>
              <CardDescription>Room revenue grouped by booking source</CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center">
              {sourceData.length === 0 ? (
                <span className="text-muted-foreground">No room revenue recorded yet.</span>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sourceData} dataKey="value" nameKey="name" outerRadius={80} label>
                      {sourceData.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="h-96 md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChartIcon className="w-5 h-5 text-muted-foreground" />
                Monthly Expenses vs Revenue
              </CardTitle>
              <CardDescription>Profitability Tracking (₹, last 6 months)</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Revenue" fill="#2563eb" />
                  <Bar dataKey="Expenses" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
