import React, { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/domain/money';
import { Booking, bookingTotal, bookingReceived, bookingPending } from '@/domain/booking';
import { useBookings } from '@/hooks/useBookings';
import { usePayments } from '@/hooks/usePayments';
import { useRooms } from '@/hooks/useRooms';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { AlertCircle, PartyPopper } from 'lucide-react';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysOutstanding(checkOut: string) {
  const ms = new Date(todayISO()).getTime() - new Date(checkOut).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

interface PendingRow {
  booking: Booking;
  total: number;
  received: number;
  pending: number;
  daysOut: number;
}

export function PendingDuesPage() {
  const { data: bookings = [], isLoading: isLoadingBookings } = useBookings();
  const { data: payments = [], isLoading: isLoadingPayments } = usePayments();
  const { data: rooms = [] } = useRooms();
  const [payingBooking, setPayingBooking] = useState<Booking | null>(null);

  const isLoading = isLoadingBookings || isLoadingPayments;

  const rows = useMemo<PendingRow[]>(() => {
    const paymentsByBooking = new Map<string, typeof payments>();
    payments.forEach(p => paymentsByBooking.set(p.bookingId, [...(paymentsByBooking.get(p.bookingId) || []), p]));

    return bookings
      .map(booking => {
        const bookingPayments = paymentsByBooking.get(booking.id) || [];
        const pending = bookingPending(booking, bookingPayments);
        return {
          booking,
          total: bookingTotal(booking),
          received: bookingReceived(bookingPayments),
          pending,
          daysOut: daysOutstanding(booking.checkOut),
        };
      })
      .filter(r => r.pending > 0)
      .sort((a, b) => b.daysOut - a.daysOut);
  }, [bookings, payments]);

  const totalPending = rows.reduce((acc, r) => acc + r.pending, 0);

  const columns: ColumnDef<PendingRow>[] = [
    { id: 'guest', header: 'Guest', cell: ({ row }) => row.original.booking.guestName },
    {
      id: 'room',
      header: 'Room',
      cell: ({ row }) => {
        const ids = row.original.booking.roomIds || ((row.original.booking as any).roomId ? [(row.original.booking as any).roomId] : []);
        return ids.map(id => rooms.find(r => r.id === id)?.roomNumber || id).join(', ');
      }
    },
    { id: 'checkIn', header: 'Check-In', cell: ({ row }) => row.original.booking.checkIn },
    { id: 'checkOut', header: 'Check-Out', cell: ({ row }) => row.original.booking.checkOut },
    { id: 'total', header: 'Bill Total', cell: ({ row }) => formatINR(row.original.total) },
    { id: 'received', header: 'Received', cell: ({ row }) => formatINR(row.original.received) },
    {
      id: 'balance',
      header: 'Balance',
      cell: ({ row }) => <span className="font-bold text-destructive">{formatINR(row.original.pending)}</span>,
    },
    {
      id: 'daysOut',
      header: 'Days Outstanding',
      cell: ({ row }) => (
        <Badge variant={row.original.daysOut > 7 ? 'destructive' : 'outline'}>
          {row.original.daysOut} day{row.original.daysOut !== 1 ? 's' : ''}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => setPayingBooking(row.original.booking)}>
          Record Payment
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={AlertCircle}
        title="Pending Dues"
        description={
          <>
            Live view over bookings with an outstanding balance — nothing here is re-typed; it appears
            the moment a booking has pending &gt; 0, and disappears the moment it's fully paid.
            Total pending: <span className="font-bold text-destructive">{formatINR(totalPending)}</span>
          </>
        }
      />

      {isLoading ? (
        <LoadingState label="Loading pending dues..." />
      ) : rows.length === 0 ? (
        <EmptyState icon={PartyPopper} title="No pending dues" description="Everyone's settled up." />
      ) : (
        <DataTable columns={columns} data={rows} />
      )}

      <RecordPaymentDialog booking={payingBooking} onOpenChange={(open) => !open && setPayingBooking(null)} />
    </div>
  );
}
