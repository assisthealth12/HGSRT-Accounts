import React, { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatINR } from '@/domain/money';
import { Booking, bookingTotal, bookingPending } from '@/domain/booking';
import { useActiveBookingsAround, useBookingsInRange, useDeleteBooking } from '@/hooks/useBookings';
import { usePaymentsInRange } from '@/hooks/usePayments';
import { useRooms } from '@/hooks/useRooms';
import { NewBookingDialog } from './NewBookingDialog';
import { BulkImportDialog } from './BulkImportDialog';
import { BulkDeleteDialog } from './BulkDeleteDialog';
import { EditBookingDialog } from './EditBookingDialog';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatCard } from '@/components/shared/StatCard';
import { BedDouble, CalendarDays, Edit, Trash2, LogIn, LogOut, DoorOpen, TrendingUp } from 'lucide-react';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function GuestRegisterTab() {
  const [date, setDate] = useState(todayISO());
  const { data: bookings = [], isLoading } = useActiveBookingsAround(date);
  const paymentsLookbackStart = useMemo(() => {
    const d = new Date(date);
    d.setDate(d.getDate() - 120);
    return d.toISOString().slice(0, 10);
  }, [date]);
  const { data: payments = [] } = usePaymentsInRange(paymentsLookbackStart, date);
  const { data: rooms = [] } = useRooms();
  const { mutateAsync: deleteBooking } = useDeleteBooking();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [payingBooking, setPayingBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const paymentsByBooking = useMemo(() => {
    const map = new Map<string, typeof payments>();
    payments.forEach(p => map.set(p.bookingId, [...(map.get(p.bookingId) || []), p]));
    return map;
  }, [payments]);

  const rowsForDate = bookings.filter(b => b.checkIn <= date && (b.checkOut > date || b.checkIn === date));
  const arrivalsCount = bookings.filter(b => b.checkIn === date).length;
  const departuresCount = bookings.filter(b => b.checkOut === date).length;
  const occupiedRoomsCount = new Set(rowsForDate.flatMap(b => b.roomIds || [])).size;
  const availableRoomsCount = Math.max(rooms.length - occupiedRoomsCount, 0);

  const columns: ColumnDef<Booking>[] = [
    { accessorKey: 'guestName', header: 'Guest' },
    { accessorKey: 'occupancy', header: 'Occupancy' },
    {
      id: 'room',
      header: 'Room',
      cell: ({ row }) => {
        const ids = row.original.roomIds || ((row.original as any).roomId ? [(row.original as any).roomId] : []);
        return ids.map(id => rooms.find(r => r.id === id)?.roomNumber || id).join(', ');
      }
    },
    { accessorKey: 'checkIn', header: 'Check-In' },
    { accessorKey: 'checkOut', header: 'Check-Out' },
    { accessorKey: 'nights', header: 'Nights' },
    { accessorKey: 'tariff', header: 'Tariff', cell: ({ row }) => formatINR(row.original.tariff) },
    { accessorKey: 'gst', header: 'GST', cell: ({ row }) => formatINR(row.original.gst) },
    { id: 'total', header: 'Total', cell: ({ row }) => formatINR(bookingTotal(row.original)) },
    {
      id: 'pending',
      header: 'Pending',
      cell: ({ row }) => {
        const pending = bookingPending(row.original, paymentsByBooking.get(row.original.id) || []);
        return pending > 0
          ? <Badge variant="destructive">{formatINR(pending)}</Badge>
          : <Badge variant="outline" className="text-success border-success">Paid</Badge>;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPayingBooking(row.original)}>Payments</Button>
          <Button variant="ghost" size="icon" onClick={() => setEditingBooking(row.original)} title="Edit Booking">
            <Edit className="w-4 h-4 text-gray-500" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              if (confirm('Are you sure you want to delete this booking?')) {
                deleteBooking(row.original.id);
              }
            }} 
            title="Delete Booking"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <div className="max-w-xs">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBulkDeleteOpen(true)}>Bulk Delete</Button>
          <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>Bulk Import</Button>
          <Button onClick={() => setIsNewOpen(true)}>New Booking</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Arrivals" value={String(arrivalsCount)} tone="primary" icon={LogIn} />
        <StatCard label="Departures" value={String(departuresCount)} tone="destructive" icon={LogOut} />
        <StatCard label="Occupied Rooms" value={String(occupiedRoomsCount)} icon={DoorOpen} />
        <StatCard label="Available Rooms" value={String(availableRoomsCount)} tone="success" icon={BedDouble} />
      </div>

      {isLoading ? (
        <LoadingState label="Loading bookings..." />
      ) : rowsForDate.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No guests checked in for this date"
          description="Pick a different date, or create a new booking."
          action={<Button onClick={() => setIsNewOpen(true)}>New Booking</Button>}
        />
      ) : (
        <DataTable columns={columns} data={rowsForDate} searchKey="guestName" />
      )}

      <NewBookingDialog open={isNewOpen} onOpenChange={setIsNewOpen} />
      <BulkImportDialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen} />
      <BulkDeleteDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen} />
      <EditBookingDialog booking={editingBooking} onOpenChange={(open) => !open && setEditingBooking(null)} />
      <RecordPaymentDialog booking={payingBooking} onOpenChange={(open) => !open && setPayingBooking(null)} />
    </div>
  );
}

const MONTHLY_PAGE_SIZE = 10;

function MonthlyRevenueTab() {
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [page, setPage] = useState(0);
  const { data: bookings = [] } = useBookingsInRange(`${month}-01`, `${month}-31`);
  const { data: payments = [] } = usePaymentsInRange(`${month}-01`, `${month}-31`);

  const paymentsByBooking = useMemo(() => {
    const map = new Map<string, typeof payments>();
    payments.forEach(p => map.set(p.bookingId, [...(map.get(p.bookingId) || []), p]));
    return map;
  }, [payments]);

  const rows = useMemo(() => {
    const dates = Array.from(new Set(
      bookings.map(b => b.checkIn)
    )).sort();

    return dates.map(date => {
      const dayBookings = bookings.filter(b => b.checkIn === date);
      const sales = dayBookings.reduce((acc, b) => acc + bookingTotal(b), 0);
      const received = dayBookings.reduce((acc, b) => {
        const p = paymentsByBooking.get(b.id) || [];
        return acc + p.reduce((s, x) => s + x.amount, 0);
      }, 0);
      return { date, bookingsCount: dayBookings.length, sales, received, pending: sales - received };
    });
  }, [bookings, paymentsByBooking, month]);

  const totals = rows.reduce((acc, r) => ({
    sales: acc.sales + r.sales,
    received: acc.received + r.received,
    pending: acc.pending + r.pending,
  }), { sales: 0, received: 0, pending: 0 });

  const pageCount = Math.max(1, Math.ceil(rows.length / MONTHLY_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pagedRows = rows.slice(currentPage * MONTHLY_PAGE_SIZE, (currentPage + 1) * MONTHLY_PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <Label>Month</Label>
        <Input type="month" value={month} onChange={(e) => { setMonth(e.target.value); setPage(0); }} />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No bookings this month yet" />
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2 font-medium">Date</th>
                <th className="text-right p-2 font-medium">Bookings</th>
                <th className="text-right p-2 font-medium">Total Sales</th>
                <th className="text-right p-2 font-medium">Received</th>
                <th className="text-right p-2 font-medium">Pending</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map(r => (
                <tr key={r.date} className="border-t">
                  <td className="p-2">{r.date}</td>
                  <td className="p-2 text-right">{r.bookingsCount}</td>
                  <td className="p-2 text-right">{formatINR(r.sales)}</td>
                  <td className="p-2 text-right text-success">{formatINR(r.received)}</td>
                  <td className="p-2 text-right text-destructive">{formatINR(r.pending)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/50 font-bold border-t-2">
              <tr>
                <td className="p-2">Total</td>
                <td className="p-2"></td>
                <td className="p-2 text-right">{formatINR(totals.sales)}</td>
                <td className="p-2 text-right">{formatINR(totals.received)}</td>
                <td className="p-2 text-right">{formatINR(totals.pending)}</td>
              </tr>
            </tfoot>
          </table>
          <div className="flex items-center justify-between px-2 py-3 border-t">
            <div className="text-sm text-muted-foreground">
              Page {currentPage + 1} of {pageCount} · {rows.length} day{rows.length !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(p - 1, 0))} disabled={currentPage === 0}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(p + 1, pageCount - 1))} disabled={currentPage >= pageCount - 1}>
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BookingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={BedDouble}
        title="Rooms & Bookings"
        description="Guest check-ins, room assignment, and payments."
      />

      <Tabs defaultValue="register">
        <TabsList className="mb-4">
          <TabsTrigger value="register" className="gap-1.5"><CalendarDays className="w-4 h-4" /> Guest Register</TabsTrigger>
          <TabsTrigger value="monthly" className="gap-1.5"><TrendingUp className="w-4 h-4" /> Monthly Room Revenue</TabsTrigger>
        </TabsList>
        <TabsContent value="register">
          <GuestRegisterTab />
        </TabsContent>
        <TabsContent value="monthly">
          <MonthlyRevenueTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
