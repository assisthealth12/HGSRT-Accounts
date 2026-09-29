import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatINR } from '@/domain/money';
import { BanquetBooking, banquetPending, banquetReceived } from '@/domain/banquetBooking';
import { useBanquetSales, useUpsertBanquetSale, useDeleteBanquetSale } from '@/hooks/useBanquetSales';
import { useBanquetBookings, useDeleteBanquetBooking } from '@/hooks/useBanquetBookings';
import { usePayments } from '@/hooks/usePayments';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { DataTable } from '@/components/data-table/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { PartyPopper, CalendarDays, BookOpenText, Plus, Trash2, Edit, MoreHorizontal, CreditCard, Banknote, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { confirmAction } from '@/hooks/use-confirm';
import { StatCard } from '@/components/shared/StatCard';
import { NewBanquetBookingDialog } from './NewBanquetBookingDialog';
import { EditBanquetBookingDialog } from './EditBanquetBookingDialog';
import { RecordBanquetPaymentDialog } from './RecordBanquetPaymentDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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

function EventRegisterSection() {
  const { data: bookings = [] } = useBanquetBookings();
  const { data: payments = [] } = usePayments();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [payingBooking, setPayingBooking] = useState<BanquetBooking | null>(null);
  const [editingBooking, setEditingBooking] = useState<BanquetBooking | null>(null);
  const { mutateAsync: deleteBooking, isPending: isDeleting } = useDeleteBanquetBooking();

  const paymentsByBooking = useMemo(() => {
    const map = new Map<string, typeof payments>();
    payments.forEach(p => map.set(p.bookingId, [...(map.get(p.bookingId) || []), p]));
    return map;
  }, [payments]);

  // Sort by event date descending
  const sortedBookings = useMemo(() => [...bookings].sort((a, b) => b.eventDate.localeCompare(a.eventDate)), [bookings]);

  const columns: ColumnDef<BanquetBooking>[] = [
    { accessorKey: 'customerName', header: 'Customer' },
    { accessorKey: 'eventType', header: 'Event Type' },
    { accessorKey: 'eventDate', header: 'Event Date' },
    { accessorKey: 'quotedAmount', header: 'Quoted Amount', cell: ({ row }) => formatINR(row.original.quotedAmount) },
    {
      id: 'received',
      header: 'Received',
      cell: ({ row }) => {
        const received = banquetReceived(paymentsByBooking.get(row.original.id) || []);
        return <span className="text-emerald-600 font-bold">{formatINR(received)}</span>;
      }
    },
    {
      id: 'pending',
      header: 'Pending',
      cell: ({ row }) => {
        const pending = banquetPending(row.original, paymentsByBooking.get(row.original.id) || []);
        return pending > 0
          ? <Badge variant="destructive" className="bg-red-50 text-red-600 border-red-200">{formatINR(pending)}</Badge>
          : <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Fully Paid</Badge>;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => setPayingBooking(row.original)}>Payments</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditingBooking(row.original)}>
                <Edit className="w-4 h-4 mr-2 text-blue-600" /> Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600"
                onClick={async () => {
                  const ok = await confirmAction({ 
                    title: 'Delete Event?', 
                    description: 'This action cannot be undone. This will permanently delete the event.', 
                    variant: 'destructive' 
                  });
                  if (ok) {
                    await deleteBooking(row.original.id);
                    toast({ title: 'Event Deleted' });
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete Event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pt-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Banquet Events</h2>
          <p className="text-sm text-gray-500">Manage large event bookings and their payments.</p>
        </div>
        <Button onClick={() => setIsNewOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 h-11 px-6 rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Book Event
        </Button>
      </div>

      {sortedBookings.length === 0 ? (
        <EmptyState
          icon={BookOpenText}
          title="No banquet events booked yet"
          description="Click the button above to book an event."
          action={<Button onClick={() => setIsNewOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">Book Banquet Event</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1">
          <DataTable columns={columns} data={sortedBookings} searchKey="customerName" />
        </div>
      )}

      <NewBanquetBookingDialog open={isNewOpen} onOpenChange={setIsNewOpen} />
      <EditBanquetBookingDialog booking={editingBooking} onOpenChange={(open) => !open && setEditingBooking(null)} />
      <RecordBanquetPaymentDialog booking={payingBooking} onOpenChange={(open) => !open && setPayingBooking(null)} />
    </div>
  );
}

function DailyExtraSalesSection() {
  const { data: banquetSales = [] } = useBanquetSales();
  const { data: banquetBookings = [] } = useBanquetBookings();
  const { data: payments = [] } = usePayments();
  const { mutateAsync: upsertBanquetSale, isPending: isSavingBanquet } = useUpsertBanquetSale();
  const { mutateAsync: deleteBanquetSale } = useDeleteBanquetSale();

  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saleDate, setSaleDate] = useState(todayISO());
  const [banquetOnline, setBanquetOnline] = useState('');
  const [banquetCash, setBanquetCash] = useState('');

  const existingBanquet = banquetSales.find(s => s.saleDate === saleDate);

  // Re-hydrate the form when opening dialog or changing date
  useEffect(() => {
    if (isDialogOpen) {
      setBanquetOnline(toRupeeInput(existingBanquet?.onlineAmount ?? 0));
      setBanquetCash(toRupeeInput(existingBanquet?.cashAmount ?? 0));
    }
  }, [saleDate, isDialogOpen, existingBanquet]);

  const handleOpenAddDialog = () => {
    setSaleDate(todayISO()); // default to today
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (date: string) => {
    setSaleDate(date);
    setIsDialogOpen(true);
  };

  const banquetOnlineAmount = toPaise(banquetOnline);
  const banquetCashAmount = toPaise(banquetCash);

  const eventPaymentsCollected = useMemo(() => {
    const banquetIds = new Set(banquetBookings.map(b => b.id));
    return payments
      .filter(p => p.paidOn === saleDate && banquetIds.has(p.bookingId))
      .reduce((acc, p) => acc + p.amount, 0);
  }, [payments, banquetBookings, saleDate]);

  const banquetTotal = banquetOnlineAmount + banquetCashAmount + eventPaymentsCollected;

  const handleSave = async () => {
    await upsertBanquetSale({
      saleDate,
      onlineAmount: banquetOnlineAmount,
      cashAmount: banquetCashAmount,
      existing: existingBanquet,
    });
    toast({ title: 'Saved', description: `Banquet sales for ${saleDate} updated.` });
    setIsDialogOpen(false);
  };

  // Monthly View Calculations
  const monthlyRows = useMemo(() => {
    const banquetIds = new Set(banquetBookings.map(b => b.id));
    const banquetByDate = new Map(banquetSales.map(s => [s.saleDate, s]));
    const banquetPayments = payments.filter(p => banquetIds.has(p.bookingId));
    
    const paymentDates = banquetPayments
      .filter(p => p.paidOn.startsWith(month))
      .map(p => p.paidOn);

    const dates = new Set([
      ...banquetSales.filter(s => s.saleDate.startsWith(month)).map(s => s.saleDate),
      ...paymentDates,
    ]);

    return Array.from(dates).sort((a, b) => b.localeCompare(a)).map(date => { // Descending
      const b = banquetByDate.get(date);
      const bOnline = b?.onlineAmount || 0;
      const bCash = b?.cashAmount || 0;
      
      const bEventPayments = banquetPayments
        .filter(p => p.paidOn === date)
        .reduce((acc, p) => acc + p.amount, 0);

      const bTotal = bOnline + bCash + bEventPayments;

      return {
        id: b?.id,
        date, bOnline, bCash, bEventPayments, bTotal,
      };
    });
  }, [banquetSales, month, banquetBookings, payments]);

  const totals = monthlyRows.reduce((acc, r) => ({
    bOnline: acc.bOnline + r.bOnline,
    bCash: acc.bCash + r.bCash,
    bEventPayments: acc.bEventPayments + r.bEventPayments,
    bTotal: acc.bTotal + r.bTotal,
  }), { bOnline: 0, bCash: 0, bEventPayments: 0, bTotal: 0 });

  // Pagination Logic
  const totalPages = Math.ceil(monthlyRows.length / itemsPerPage);
  const paginatedRows = monthlyRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm max-w-sm flex-1">
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
              className="h-10 font-bold border-none bg-gray-50/50 shadow-none focus-visible:ring-1 focus-visible:ring-emerald-500" 
            />
          </div>
        </div>
        
        <Button 
          onClick={handleOpenAddDialog} 
          className="rounded-xl h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Extra Sales Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Extra Online" value={formatINR(totals.bOnline)} colorTheme="blue" icon={CreditCard} />
        <StatCard label="Extra Cash" value={formatINR(totals.bCash)} colorTheme="green" icon={Banknote} />
        <StatCard label="Event Payments" value={formatINR(totals.bEventPayments)} colorTheme="orange" icon={BookOpenText} />
        <StatCard label="Total Revenue" value={formatINR(totals.bTotal)} colorTheme="purple" icon={PartyPopper} />
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
                  <th className="p-4 font-semibold text-gray-600 text-right">Extra Online</th>
                  <th className="p-4 font-semibold text-gray-600 text-right">Extra Cash</th>
                  <th className="p-4 font-semibold text-orange-600 text-right">Event Payments</th>
                  <th className="p-4 font-bold text-gray-900 text-right">Daily Total</th>
                  <th className="p-4 font-semibold text-gray-600 text-center w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedRows.map(r => (
                  <tr key={r.date} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-medium text-gray-900">{r.date}</td>
                    <td className="p-4 text-right font-medium text-gray-700">{formatINR(r.bOnline)}</td>
                    <td className="p-4 text-right font-medium text-gray-700">{formatINR(r.bCash)}</td>
                    <td className="p-4 text-right font-medium text-orange-600">{formatINR(r.bEventPayments)}</td>
                    <td className="p-4 text-right font-bold text-gray-900 bg-gray-50/30">{formatINR(r.bTotal)}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* Only show Edit/Delete if there's an actual misc entry (r.id) OR if we want to let them ADD an entry for a date that only has event payments. */}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50" 
                          onClick={() => handleOpenEditDialog(r.date)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {r.id ? (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-600 hover:bg-red-50" 
                            onClick={async () => {
                              const ok = await confirmAction({ title: 'Delete Entry', description: `Delete extra sales entry for ${r.date}?`, variant: 'destructive' });
                              if (ok && r.id) {
                                await deleteBanquetSale(r.id);
                                toast({ title: 'Deleted' });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        ) : (
                          <div className="w-8 h-8" /> // Empty placeholder to keep alignment
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

      {/* DIALOG FOR ADD / EDIT */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{existingBanquet ? 'Edit Extra Sales Entry' : 'Add Extra Sales Entry'}</DialogTitle>
            <DialogDescription>Enter extra banquet collections for the selected date.</DialogDescription>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-500" /> Extra Online (₹)
                </Label>
                <Input type="number" value={banquetOnline} onChange={(e) => setBanquetOnline(e.target.value)} className="rounded-xl h-11" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-green-500" /> Extra Cash (₹)
                </Label>
                <Input type="number" value={banquetCash} onChange={(e) => setBanquetCash(e.target.value)} className="rounded-xl h-11" placeholder="0" />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-orange-50/50 border border-orange-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BookOpenText className="w-4 h-4 text-orange-600" />
                <div className="text-sm font-semibold text-orange-900">Event Payments (Auto)</div>
              </div>
              <div className="text-lg font-bold text-orange-700">{formatINR(eventPaymentsCollected)}</div>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100 text-center">
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Extras Total</div>
                <div className="text-sm font-bold text-gray-800">{formatINR(banquetOnlineAmount + banquetCashAmount)}</div>
              </div>
              <div className="border-l border-gray-200">
                <div className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-1">Events Total</div>
                <div className="text-sm font-bold text-orange-800">{formatINR(eventPaymentsCollected)}</div>
              </div>
              <div className="border-l border-gray-200">
                <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">Daily Revenue</div>
                <div className="text-sm font-bold text-purple-900">{formatINR(banquetTotal)}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-11">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSavingBanquet} className="rounded-xl h-11 bg-emerald-600 hover:bg-emerald-700 text-white px-6">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {isSavingBanquet ? 'Saving...' : 'Save Entry'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function BanquetSalesPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <PageHeader
        icon={PartyPopper}
        title="Banquet Management"
        description="Manage large events and track daily extra banquet sales."
      />

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="mb-6 bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="events" className="rounded-lg px-6">Event Register</TabsTrigger>
          <TabsTrigger value="daily" className="rounded-lg px-6">Daily Extra Sales</TabsTrigger>
        </TabsList>
        
        <TabsContent value="events" className="mt-0">
          <EventRegisterSection />
        </TabsContent>
        <TabsContent value="daily" className="mt-0">
          <DailyExtraSalesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
