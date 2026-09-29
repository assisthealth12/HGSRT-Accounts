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
import { useBookings } from '@/hooks/useBookings';
import { usePayments } from '@/hooks/usePayments';
import { useRooms } from '@/hooks/useRooms';
import { NewBookingDialog } from './NewBookingDialog';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { BedDouble, CalendarDays } from 'lucide-react';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function GuestRegisterTab() {
  const [date, setDate] = useState(todayISO());
  const { data: bookings = [], isLoading } = useBookings();
  const { data: payments = [] } = usePayments();
  const { data: rooms = [] } = useRooms();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [payingBooking, setPayingBooking] = useState<Booking | null>(null);

  const paymentsByBooking = useMemo(() => {
    const map = new Map<string, typeof payments>();
    payments.forEach(p => map.set(p.bookingId, [...(map.get(p.bookingId) || []), p]));
    return map;
  }, [payments]);

  const rowsForDate = bookings.filter(b => b.checkIn <= date && b.checkOut > date);

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
        <Button variant="outline" size="sm" onClick={() => setPayingBooking(row.original)}>Payments</Button>
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
        <Button onClick={() => setIsNewOpen(true)}>New Booking</Button>
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
      <RecordPaymentDialog booking={payingBooking} onOpenChange={(open) => !open && setPayingBooking(null)} />
    </div>
  );
}

function MonthlyRevenueTab() {
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const { data: bookings = [] } = useBookings();
  const { data: payments = [] } = usePayments();

  const paymentsByBooking = useMemo(() => {
    const map = new Map<string, typeof payments>();
    payments.forEach(p => map.set(p.bookingId, [...(map.get(p.bookingId) || []), p]));
    return map;
  }, [payments]);

  const rows = useMemo(() => {
    const dates = Array.from(new Set(
      bookings.filter(b => b.checkIn.startsWith(month)).map(b => b.checkIn)
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

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <Label>Month</Label>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
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
              {rows.map(r => (
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
          <TabsTrigger value="register">Guest Register</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Room Revenue</TabsTrigger>
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
