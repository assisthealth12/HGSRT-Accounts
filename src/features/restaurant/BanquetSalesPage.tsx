import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatINR } from '@/domain/money';
import { BanquetBooking, banquetPending, banquetReceived } from '@/domain/banquetBooking';
import { useBanquetSales, useUpsertBanquetSale } from '@/hooks/useBanquetSales';
import { useBanquetBookings, useDeleteBanquetBooking } from '@/hooks/useBanquetBookings';
import { usePayments } from '@/hooks/usePayments';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { DataTable } from '@/components/data-table/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { PartyPopper, CalendarDays, BookOpenText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { NewBanquetBookingDialog } from './NewBanquetBookingDialog';
import { EditBanquetBookingDialog } from './EditBanquetBookingDialog';
import { RecordBanquetPaymentDialog } from './RecordBanquetPaymentDialog';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
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
  DialogFooter,
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

function EventRegisterTab() {
  const { data: bookings = [] } = useBanquetBookings();
  const { data: payments = [] } = usePayments();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [payingBooking, setPayingBooking] = useState<BanquetBooking | null>(null);
  const [editingBooking, setEditingBooking] = useState<BanquetBooking | null>(null);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
  const { mutateAsync: deleteBooking, isPending: isDeleting } = useDeleteBanquetBooking();

  const confirmDelete = async () => {
    if (!deletingBookingId) return;
    try {
      await deleteBooking(deletingBookingId);
      toast({ title: 'Event Deleted' });
      setDeletingBookingId(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

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
        return <span className="text-success font-medium">{formatINR(received)}</span>;
      }
    },
    {
      id: 'pending',
      header: 'Pending',
      cell: ({ row }) => {
        const pending = banquetPending(row.original, paymentsByBooking.get(row.original.id) || []);
        return pending > 0
          ? <Badge variant="destructive">{formatINR(pending)}</Badge>
          : <Badge variant="outline" className="text-success border-success">Fully Paid</Badge>;
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
                <Edit className="w-4 h-4 mr-2" /> Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeletingBookingId(row.original.id)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" /> Delete Event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsNewOpen(true)}>Book Banquet Event</Button>
      </div>

      {sortedBookings.length === 0 ? (
        <EmptyState
          icon={BookOpenText}
          title="No banquet events booked yet"
          description="Click the button above to book an event."
          action={<Button onClick={() => setIsNewOpen(true)}>Book Banquet Event</Button>}
        />
      ) : (
        <DataTable columns={columns} data={sortedBookings} searchKey="customerName" />
      )}

      <NewBanquetBookingDialog open={isNewOpen} onOpenChange={setIsNewOpen} />
      <EditBanquetBookingDialog booking={editingBooking} onOpenChange={(open) => !open && setEditingBooking(null)} />
      <RecordBanquetPaymentDialog booking={payingBooking} onOpenChange={(open) => !open && setPayingBooking(null)} />

      <Dialog open={!!deletingBookingId} onOpenChange={(open) => !open && setDeletingBookingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the event and remove its data from our servers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeletingBookingId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DailyEntryTab() {
  const [saleDate, setSaleDate] = useState(todayISO());
  const { data: banquetSales = [] } = useBanquetSales();
  const { mutateAsync: upsertBanquetSale, isPending: isSavingBanquet } = useUpsertBanquetSale();
  const { data: banquetBookings = [] } = useBanquetBookings();
  const { data: payments = [] } = usePayments();

  const existingBanquet = banquetSales.find(s => s.saleDate === saleDate);

  const [banquetOnline, setBanquetOnline] = useState('');
  const [banquetCash, setBanquetCash] = useState('');

  // Re-hydrate the form whenever the selected date (or its saved data) changes.
  const loadedDateRef = React.useRef<string | null>(null);
  if (loadedDateRef.current !== saleDate) {
    loadedDateRef.current = saleDate;
    setBanquetOnline(toRupeeInput(existingBanquet?.onlineAmount ?? 0));
    setBanquetCash(toRupeeInput(existingBanquet?.cashAmount ?? 0));
  }

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
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Entry Date</Label>
          <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="w-48 text-lg rounded-xl h-12" />
        </div>
        <Button onClick={handleSave} disabled={isSavingBanquet} className="rounded-xl h-12 px-8 font-semibold shadow-sm text-base">
          {isSavingBanquet ? 'Saving...' : `Save for ${saleDate}`}
        </Button>
      </div>

      <div className="space-y-8">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded flex items-center justify-center bg-blue-100 text-blue-600 font-bold text-sm">
              <PartyPopper className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Banquet Sales</h2>
          </div>
          <Card className="rounded-2xl border-none shadow-md overflow-hidden bg-white">
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-400 to-blue-600" />
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Online (₹)</Label>
                  <Input type="number" value={banquetOnline} onChange={(e) => setBanquetOnline(e.target.value)} className="rounded-xl text-lg h-12 bg-gray-50/50" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Misc Cash (₹)</Label>
                  <Input type="number" value={banquetCash} onChange={(e) => setBanquetCash(e.target.value)} className="rounded-xl text-lg h-12 bg-gray-50/50" placeholder="0" />
                </div>
              </div>
              
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="text-sm font-bold text-gray-600 uppercase tracking-widest">Event Payments Collected (Auto)</span>
                <span className="text-xl font-bold text-gray-800">{formatINR(eventPaymentsCollected)}</span>
              </div>
              
              <div className="pt-6 border-t border-gray-100">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div className="text-sm font-black text-blue-900 uppercase tracking-widest">Banquet Total</div>
                  <div className="text-4xl font-black text-blue-800">{formatINR(banquetTotal)}</div>
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
  const { data: banquetSales = [] } = useBanquetSales();
  const { data: banquetBookings = [] } = useBanquetBookings();
  const { data: payments = [] } = usePayments();

  const rows = useMemo(() => {
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

    return Array.from(dates).sort().map(date => {
      const b = banquetByDate.get(date);
      const bOnline = b?.onlineAmount || 0;
      const bCash = b?.cashAmount || 0;
      
      const bEventPayments = banquetPayments
        .filter(p => p.paidOn === date)
        .reduce((acc, p) => acc + p.amount, 0);

      const bTotal = bOnline + bCash + bEventPayments;

      return {
        date, bOnline, bCash, bEventPayments, bTotal,
      };
    });
  }, [banquetSales, month, banquetBookings, payments]);

  const totals = rows.reduce((acc, r) => ({
    bOnline: acc.bOnline + r.bOnline,
    bCash: acc.bCash + r.bCash,
    bEventPayments: acc.bEventPayments + r.bEventPayments,
    bTotal: acc.bTotal + r.bTotal,
  }), { bOnline: 0, bCash: 0, bEventPayments: 0, bTotal: 0 });

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
                <th className="text-right p-3 font-semibold text-gray-600">Misc Online</th>
                <th className="text-right p-3 font-semibold text-gray-600">Misc Cash</th>
                <th className="text-right p-3 font-semibold text-gray-600">Event Payments</th>
                <th className="text-right p-3 font-bold text-gray-800">Daily Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.date} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="p-3 font-medium text-gray-700">{r.date}</td>
                  <td className="p-3 text-right">{formatINR(r.bOnline)}</td>
                  <td className="p-3 text-right">{formatINR(r.bCash)}</td>
                  <td className="p-3 text-right">{formatINR(r.bEventPayments)}</td>
                  <td className="p-3 text-right font-bold text-gray-800 bg-gray-50/50">{formatINR(r.bTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-200">
              <tr>
                <td className="p-3 text-gray-700">Total</td>
                <td className="p-3 text-right">{formatINR(totals.bOnline)}</td>
                <td className="p-3 text-right">{formatINR(totals.bCash)}</td>
                <td className="p-3 text-right">{formatINR(totals.bEventPayments)}</td>
                <td className="p-3 text-right text-gray-800">{formatINR(totals.bTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export function BanquetSalesPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <PageHeader
        icon={PartyPopper}
        title="Banquet Daily Sales"
        description="One entry per date for all banquet hall sales and related operations."
      />

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="mb-6 bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="events" className="rounded-lg px-6">Event Register</TabsTrigger>
          <TabsTrigger value="entry" className="rounded-lg px-6">Daily Misc Sales</TabsTrigger>
          <TabsTrigger value="monthly" className="rounded-lg px-6">Monthly View</TabsTrigger>
        </TabsList>
        <TabsContent value="events" className="mt-0">
          <EventRegisterTab />
        </TabsContent>
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
