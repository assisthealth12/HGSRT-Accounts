import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatINR } from '@/domain/money';
import { totalBooked, totalCollected, dailyTotal } from '@/domain/restaurantDailySales';
import { useRestaurantDailySales, useUpsertRestaurantDailySale } from '@/hooks/useRestaurantDailySales';
import { useBookings } from '@/hooks/useBookings';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { UtensilsCrossed, CalendarDays } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function toRupeeInput(paise: number) {
  return paise ? String(paise / 100) : '';
}

function toPaise(value: string) {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : Math.round(n * 100);
}

function DailyEntryTab() {
  const [saleDate, setSaleDate] = useState(todayISO());
  const { data: restaurantSales = [] } = useRestaurantDailySales();
  const { data: bookings = [] } = useBookings();
  const { mutateAsync: upsertRestaurantSale, isPending: isSavingRestaurant } = useUpsertRestaurantDailySale();

  const existingRestaurant = restaurantSales.find(s => s.saleDate === saleDate);

  const [online, setOnline] = useState('');
  const [cash, setCash] = useState('');
  const [pending, setPending] = useState('');
  const [pendingNotes, setPendingNotes] = useState('');

  // Re-hydrate the form whenever the selected date (or its saved data) changes.
  const loadedDateRef = React.useRef<string | null>(null);
  if (loadedDateRef.current !== saleDate) {
    loadedDateRef.current = saleDate;
    setOnline(toRupeeInput(existingRestaurant?.onlineAmount ?? 0));
    setCash(toRupeeInput(existingRestaurant?.cashAmount ?? 0));
    setPending(toRupeeInput(existingRestaurant?.pendingAmount ?? 0));
    setPendingNotes(existingRestaurant?.pendingNotes ?? '');
  }

  const onlineAmount = toPaise(online);
  const cashAmount = toPaise(cash);
  const pendingAmount = toPaise(pending);

  const mealPlanAllocation = useMemo(
    () => bookings
      .filter(b => b.checkIn === saleDate)
      .reduce((acc, b) => acc + b.addonAmount, 0),
    [bookings, saleDate]
  );

  const booked = totalBooked(onlineAmount, cashAmount, pendingAmount);
  const collected = totalCollected(onlineAmount, cashAmount);
  const restaurantDayTotal = dailyTotal(onlineAmount, cashAmount, mealPlanAllocation);

  const handleSave = async () => {
    await upsertRestaurantSale({
      saleDate,
      onlineAmount,
      cashAmount,
      pendingAmount,
      pendingNotes,
      existing: existingRestaurant,
    });
    toast({ title: 'Saved', description: `Sales for ${saleDate} updated.` });
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Entry Date</Label>
          <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="w-48 text-lg rounded-xl h-12" />
        </div>
        <Button onClick={handleSave} disabled={isSavingRestaurant} className="rounded-xl h-12 px-8 font-semibold shadow-sm text-base">
          {isSavingRestaurant ? 'Saving...' : `Save for ${saleDate}`}
        </Button>
      </div>

      <div className="space-y-8">
        {/* RESTAURANT SECTION */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <UtensilsCrossed className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Restaurant Sales</h2>
          </div>
          <Card className="rounded-2xl border-none shadow-md overflow-hidden bg-white">
            <div className="h-1.5 w-full bg-gradient-to-r from-purple-400 to-purple-600" />
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Online (₹)</Label>
                  <Input type="number" value={online} onChange={(e) => setOnline(e.target.value)} className="rounded-xl text-lg h-12 bg-gray-50/50" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Cash (₹)</Label>
                  <Input type="number" value={cash} onChange={(e) => setCash(e.target.value)} className="rounded-xl text-lg h-12 bg-gray-50/50" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Pending (₹)</Label>
                  <Input type="number" value={pending} onChange={(e) => setPending(e.target.value)} className="rounded-xl text-lg h-12 border-orange-200 focus-visible:ring-orange-500 bg-orange-50/30" placeholder="0" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Pending Notes (optional)</Label>
                <Input value={pendingNotes} onChange={(e) => setPendingNotes(e.target.value)} className="rounded-xl h-12 text-gray-700 bg-gray-50/50" placeholder="e.g. Room 204 corporate bill, to be settled by accounts" />
              </div>

              <div className="p-5 rounded-xl bg-blue-50/50 border border-blue-100/50 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-blue-900">Meal Plan Allocation</div>
                  <div className="text-xs font-medium text-blue-700/70">Auto-filled from today's bookings</div>
                </div>
                <div className="text-2xl font-black text-blue-700">{formatINR(mealPlanAllocation)}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-100">
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100/50">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Total Booked</div>
                  <div className="text-2xl font-black text-gray-800">{formatINR(booked)}</div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100/50">
                  <div className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1">Total Collected</div>
                  <div className="text-2xl font-black text-emerald-800">{formatINR(collected)}</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-5 border border-purple-100/50 shadow-sm">
                  <div className="text-xs font-bold text-purple-700 uppercase tracking-widest mb-1">Daily Total</div>
                  <div className="text-2xl font-black text-purple-800">{formatINR(restaurantDayTotal)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  );
}

function MonthlyViewTab() {
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const { data: restaurantSales = [] } = useRestaurantDailySales();
  const { data: bookings = [] } = useBookings();

  const rows = useMemo(() => {
    const restaurantByDate = new Map(restaurantSales.map(s => [s.saleDate, s]));
    const mealPlanByDate = new Map<string, number>();
    bookings.forEach(b => {
      mealPlanByDate.set(b.checkIn, (mealPlanByDate.get(b.checkIn) || 0) + b.addonAmount);
    });

    const dates = new Set([
      ...restaurantSales.filter(s => s.saleDate.startsWith(month)).map(s => s.saleDate),
    ]);

    return Array.from(dates).sort().map(date => {
      const r = restaurantByDate.get(date);
      const mealPlan = mealPlanByDate.get(date) || 0;
      const rOnline = r?.onlineAmount || 0;
      const rCash = r?.cashAmount || 0;
      const rPending = r?.pendingAmount || 0;
      const rDailyTotal = dailyTotal(rOnline, rCash, mealPlan);

      return {
        date, rOnline, rCash, rPending, mealPlan, rDailyTotal,
      };
    });
  }, [restaurantSales, bookings, month]);

  const totals = rows.reduce((acc, r) => ({
    rOnline: acc.rOnline + r.rOnline,
    rCash: acc.rCash + r.rCash,
    rPending: acc.rPending + r.rPending,
    mealPlan: acc.mealPlan + r.mealPlan,
    rDailyTotal: acc.rDailyTotal + r.rDailyTotal,
  }), { rOnline: 0, rCash: 0, rPending: 0, mealPlan: 0, rDailyTotal: 0 });

  return (
    <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="max-w-xs">
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Month</Label>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-xl h-11" />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No entries for this month yet" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="text-left p-3 font-semibold text-gray-600">Date</th>
                <th className="text-right p-3 font-semibold text-gray-600">Online</th>
                <th className="text-right p-3 font-semibold text-gray-600">Cash</th>
                <th className="text-right p-3 font-semibold text-gray-600">Pending</th>
                <th className="text-right p-3 font-semibold text-blue-700">Meal Plan</th>
                <th className="text-right p-3 font-bold text-gray-800">Daily Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.date} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="p-3 font-medium text-gray-700">{r.date}</td>
                  <td className="p-3 text-right">{formatINR(r.rOnline)}</td>
                  <td className="p-3 text-right">{formatINR(r.rCash)}</td>
                  <td className="p-3 text-right text-orange-600 font-medium">{formatINR(r.rPending)}</td>
                  <td className="p-3 text-right text-blue-700">{formatINR(r.mealPlan)}</td>
                  <td className="p-3 text-right font-bold text-gray-800 bg-gray-50/50">{formatINR(r.rDailyTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-200">
              <tr>
                <td className="p-3 text-gray-700">Total</td>
                <td className="p-3 text-right">{formatINR(totals.rOnline)}</td>
                <td className="p-3 text-right">{formatINR(totals.rCash)}</td>
                <td className="p-3 text-right text-orange-600">{formatINR(totals.rPending)}</td>
                <td className="p-3 text-right text-blue-700">{formatINR(totals.mealPlan)}</td>
                <td className="p-3 text-right text-gray-800">{formatINR(totals.rDailyTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export function RestaurantSalesPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <PageHeader
        icon={UtensilsCrossed}
        title="Restaurant Daily Sales"
        description="One entry per date for all restaurant sales, with meal plan auto-allocations."
      />

      <Tabs defaultValue="entry" className="w-full">
        <TabsList className="mb-6 bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="entry" className="rounded-lg px-6">Daily Entry</TabsTrigger>
          <TabsTrigger value="monthly" className="rounded-lg px-6">Monthly View</TabsTrigger>
        </TabsList>
        <TabsContent value="entry" className="mt-0">
          <DailyEntryTab />
        </TabsContent>
        <TabsContent value="monthly" className="mt-0">
          <MonthlyViewTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
