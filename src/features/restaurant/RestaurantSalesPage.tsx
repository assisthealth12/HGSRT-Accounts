import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatINR } from '@/domain/money';
import { totalBooked, totalCollected, dailyTotal } from '@/domain/restaurantDailySales';
import { useRestaurantDailySales, useUpsertRestaurantDailySale, useDeleteRestaurantDailySale } from '@/hooks/useRestaurantDailySales';
import { useBookings } from '@/hooks/useBookings';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatCard } from '@/components/shared/StatCard';
import { UtensilsCrossed, CalendarDays, Trash2, Edit, CreditCard, Banknote, AlertCircle, Coffee, CheckCircle2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { confirmAction } from '@/hooks/use-confirm';

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

export function RestaurantSalesPage() {
  const { data: restaurantSales = [] } = useRestaurantDailySales();
  const { data: bookings = [] } = useBookings();
  const { mutateAsync: upsertRestaurantSale, isPending: isSavingRestaurant } = useUpsertRestaurantDailySale();
  const { mutateAsync: deleteRestaurantSale } = useDeleteRestaurantDailySale();

  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saleDate, setSaleDate] = useState(todayISO());
  const [online, setOnline] = useState('');
  const [cash, setCash] = useState('');
  const [pending, setPending] = useState('');
  const [pendingNotes, setPendingNotes] = useState('');

  const existingRestaurant = restaurantSales.find(s => s.saleDate === saleDate);

  // Re-hydrate the form when opening dialog or changing date
  useEffect(() => {
    if (isDialogOpen) {
      setOnline(toRupeeInput(existingRestaurant?.onlineAmount ?? 0));
      setCash(toRupeeInput(existingRestaurant?.cashAmount ?? 0));
      setPending(toRupeeInput(existingRestaurant?.pendingAmount ?? 0));
      setPendingNotes(existingRestaurant?.pendingNotes ?? '');
    }
  }, [saleDate, isDialogOpen, existingRestaurant]);

  const handleOpenAddDialog = () => {
    setSaleDate(todayISO()); // default to today
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (date: string) => {
    setSaleDate(date);
    setIsDialogOpen(true);
  };

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
    setIsDialogOpen(false);
  };

  // Monthly View Calculations
  const monthlyRows = useMemo(() => {
    const restaurantByDate = new Map(restaurantSales.map(s => [s.saleDate, s]));
    const mealPlanByDate = new Map<string, number>();
    bookings.forEach(b => {
      mealPlanByDate.set(b.checkIn, (mealPlanByDate.get(b.checkIn) || 0) + b.addonAmount);
    });

    const dates = new Set([
      ...restaurantSales.filter(s => s.saleDate.startsWith(month)).map(s => s.saleDate),
    ]);

    return Array.from(dates).sort((a, b) => b.localeCompare(a)).map(date => { // Sort descending
      const r = restaurantByDate.get(date);
      const mealPlan = mealPlanByDate.get(date) || 0;
      const rOnline = r?.onlineAmount || 0;
      const rCash = r?.cashAmount || 0;
      const rPending = r?.pendingAmount || 0;
      const rDailyTotal = dailyTotal(rOnline, rCash, mealPlan);

      return {
        id: r?.id,
        date, rOnline, rCash, rPending, mealPlan, rDailyTotal,
      };
    });
  }, [restaurantSales, bookings, month]);

  const totals = monthlyRows.reduce((acc, r) => ({
    rOnline: acc.rOnline + r.rOnline,
    rCash: acc.rCash + r.rCash,
    rPending: acc.rPending + r.rPending,
    mealPlan: acc.mealPlan + r.mealPlan,
    rDailyTotal: acc.rDailyTotal + r.rDailyTotal,
  }), { rOnline: 0, rCash: 0, rPending: 0, mealPlan: 0, rDailyTotal: 0 });

  // Pagination Logic
  const totalPages = Math.ceil(monthlyRows.length / itemsPerPage);
  const paginatedRows = monthlyRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader
          icon={UtensilsCrossed}
          title="Restaurant Sales"
          description="Track daily restaurant revenue and collections."
        />
        <Button 
          onClick={handleOpenAddDialog} 
          className="rounded-xl h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm mb-4 md:mb-8"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Daily Entry
        </Button>
      </div>

      {/* MONTHLY VIEW */}
      <section className="space-y-6">
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm max-w-sm">
          <CalendarDays className="w-5 h-5 text-gray-500" />
          <div className="flex-1">
            <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Select Month</Label>
            <Input 
              type="month" 
              value={month} 
              onChange={(e) => {
                setMonth(e.target.value);
                setCurrentPage(1);
              }} 
              className="h-10 font-bold border-none bg-gray-50/50 shadow-none focus-visible:ring-1 focus-visible:ring-purple-500" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Online Collection" value={formatINR(totals.rOnline)} colorTheme="blue" icon={CreditCard} />
          <StatCard label="Cash Collection" value={formatINR(totals.rCash)} colorTheme="green" icon={Banknote} />
          <StatCard label="Pending Dues" value={formatINR(totals.rPending)} colorTheme="orange" icon={AlertCircle} />
          <StatCard label="Total Revenue" value={formatINR(totals.rDailyTotal)} colorTheme="purple" icon={UtensilsCrossed} />
        </div>

        {monthlyRows.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No entries for this month yet" />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="p-4 font-semibold text-gray-600 w-[150px]">Date</th>
                    <th className="p-4 font-semibold text-gray-600 text-right">Online</th>
                    <th className="p-4 font-semibold text-gray-600 text-right">Cash</th>
                    <th className="p-4 font-semibold text-orange-600 text-right">Pending</th>
                    <th className="p-4 font-semibold text-blue-600 text-right">Meal Plan</th>
                    <th className="p-4 font-bold text-gray-900 text-right">Daily Total</th>
                    <th className="p-4 font-semibold text-gray-600 text-center w-[120px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedRows.map(r => (
                    <tr key={r.date} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">
                        {r.date}
                      </td>
                      <td className="p-4 text-right font-medium text-gray-700">{formatINR(r.rOnline)}</td>
                      <td className="p-4 text-right font-medium text-gray-700">{formatINR(r.rCash)}</td>
                      <td className="p-4 text-right font-medium text-orange-600">{formatINR(r.rPending)}</td>
                      <td className="p-4 text-right font-medium text-blue-600">{formatINR(r.mealPlan)}</td>
                      <td className="p-4 text-right font-bold text-gray-900 bg-gray-50/30">{formatINR(r.rDailyTotal)}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50" 
                            onClick={() => handleOpenEditDialog(r.date)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {r.id && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-600 hover:bg-red-50" 
                              onClick={async () => {
                                const ok = await confirmAction({ title: 'Delete Entry', description: `Delete entry for ${r.date}?`, variant: 'destructive' });
                                if (ok && r.id) {
                                  await deleteRestaurantSale(r.id);
                                  toast({ title: 'Deleted' });
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50">
                <div className="text-sm text-gray-500">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, monthlyRows.length)}</span> of <span className="font-medium">{monthlyRows.length}</span> entries
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <div className="text-sm font-medium text-gray-700 px-2">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* DIALOG FOR ADD / EDIT */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{existingRestaurant ? 'Edit Daily Entry' : 'Add Daily Entry'}</DialogTitle>
            <DialogDescription>Enter restaurant sales and pending bills for the selected date.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-2">
            <div>
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Entry Date</Label>
              <Input 
                type="date" 
                value={saleDate} 
                onChange={(e) => setSaleDate(e.target.value)} 
                className="w-full sm:w-48 text-lg font-medium rounded-xl h-12" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-500" /> Online (₹)
                </Label>
                <Input type="number" value={online} onChange={(e) => setOnline(e.target.value)} className="rounded-xl h-11" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-green-500" /> Cash (₹)
                </Label>
                <Input type="number" value={cash} onChange={(e) => setCash(e.target.value)} className="rounded-xl h-11" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Pending (₹)
                </Label>
                <Input type="number" value={pending} onChange={(e) => setPending(e.target.value)} className="rounded-xl h-11 border-orange-200 bg-orange-50/30" placeholder="0" />
              </div>
            </div>
            
            {pendingAmount > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Pending Notes (Required if pending &gt; 0)</Label>
                <Input value={pendingNotes} onChange={(e) => setPendingNotes(e.target.value)} className="rounded-xl h-11" placeholder="e.g. Room 204 corporate bill" />
              </div>
            )}

            <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Coffee className="w-4 h-4 text-blue-600" />
                <div className="text-sm font-semibold text-blue-900">Meal Plan Allocation</div>
              </div>
              <div className="text-lg font-bold text-blue-700">{formatINR(mealPlanAllocation)}</div>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100 text-center">
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Total Booked</div>
                <div className="text-sm font-bold text-gray-800">{formatINR(booked)}</div>
              </div>
              <div className="border-l border-gray-200">
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Collected</div>
                <div className="text-sm font-bold text-emerald-800">{formatINR(collected)}</div>
              </div>
              <div className="border-l border-gray-200">
                <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">Daily Revenue</div>
                <div className="text-sm font-bold text-purple-900">{formatINR(restaurantDayTotal)}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-11">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSavingRestaurant} className="rounded-xl h-11 bg-emerald-600 hover:bg-emerald-700 text-white px-6">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {isSavingRestaurant ? 'Saving...' : 'Save Entry'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
