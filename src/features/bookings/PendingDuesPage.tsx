import React, { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/domain/money';
import { Booking, bookingTotal, bookingReceived, bookingPending } from '@/domain/booking';
import { useBookings, useDeleteBooking } from '@/hooks/useBookings';
import { usePayments } from '@/hooks/usePayments';
import { useRooms } from '@/hooks/useRooms';
import { useCompanies } from '@/hooks/useCompanies';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EditBookingDialog } from './EditBookingDialog';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, PartyPopper, Edit, Trash2 } from 'lucide-react';

type DaysFilter = 'all' | '7' | '15' | '30';

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
  const { data: companies = [] } = useCompanies();
  const { mutateAsync: deleteBooking } = useDeleteBooking();
  const [payingBooking, setPayingBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [daysFilter, setDaysFilter] = useState<DaysFilter>('all');
  const [checkInFrom, setCheckInFrom] = useState('');
  const [checkInTo, setCheckInTo] = useState('');
  const [companyFilter, setCompanyFilter] = useState(''); // '' = all, '__none' = no company

  const isLoading = isLoadingBookings || isLoadingPayments;

  const allPendingRows = useMemo<PendingRow[]>(() => {
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

  const rows = useMemo(() => {
    const minDays = daysFilter === 'all' ? 0 : parseInt(daysFilter, 10);
    return allPendingRows.filter(r => {
      if (r.daysOut < minDays) return false;
      if (checkInFrom && r.booking.checkIn < checkInFrom) return false;
      if (checkInTo && r.booking.checkIn > checkInTo) return false;
      if (companyFilter === '__none' && r.booking.companyId) return false;
      if (companyFilter && companyFilter !== '__none' && r.booking.companyId !== companyFilter) return false;
      return true;
    });
  }, [allPendingRows, daysFilter, checkInFrom, checkInTo, companyFilter]);

  const totalPending = rows.reduce((acc, r) => acc + r.pending, 0);

  // Per-company pending breakdown — always computed off the days/date-filtered set
  // (ignoring the company dropdown itself) so the summary always shows every company
  // at once, and clicking one just narrows the table below it.
  const companyBreakdown = useMemo(() => {
    const minDays = daysFilter === 'all' ? 0 : parseInt(daysFilter, 10);
    const dateFiltered = allPendingRows.filter(r => {
      if (r.daysOut < minDays) return false;
      if (checkInFrom && r.booking.checkIn < checkInFrom) return false;
      if (checkInTo && r.booking.checkIn > checkInTo) return false;
      return true;
    });
    const byCompany = new Map<string, number>(); // key: companyId or '__none'
    dateFiltered.forEach(r => {
      const key = r.booking.companyId || '__none';
      byCompany.set(key, (byCompany.get(key) || 0) + r.pending);
    });
    return Array.from(byCompany.entries())
      .map(([key, pending]) => ({
        key,
        name: key === '__none' ? 'No Company' : companies.find(c => c.id === key)?.name || 'Unknown Company',
        pending,
      }))
      .sort((a, b) => b.pending - a.pending);
  }, [allPendingRows, daysFilter, checkInFrom, checkInTo, companies]);

  const columns: ColumnDef<PendingRow>[] = [
    { id: 'guestName', accessorFn: (row) => row.booking.guestName, header: 'Guest' },
    {
      id: 'room',
      header: 'Room',
      cell: ({ row }) => {
        const ids = row.original.booking.roomIds || ((row.original.booking as any).roomId ? [(row.original.booking as any).roomId] : []);
        return ids.map(id => rooms.find(r => r.id === id)?.roomNumber || id).join(', ');
      }
    },
    {
      id: 'company',
      header: 'Company',
      cell: ({ row }) => {
        const companyId = row.original.booking.companyId;
        if (!companyId) return <span className="text-gray-400">—</span>;
        return companies.find(c => c.id === companyId)?.name || 'Unknown';
      },
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPayingBooking(row.original.booking)}>
            Record Payment
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setEditingBooking(row.original.booking)} title="Edit Booking">
            <Edit className="w-4 h-4 text-gray-500" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              if (confirm('Are you sure you want to delete this booking?')) {
                deleteBooking(row.original.booking.id);
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

      <div className="flex flex-wrap items-end gap-4 bg-gray-50 border border-gray-100 rounded-xl p-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Outstanding For At Least</Label>
          <div className="flex gap-1">
            {(['all', '7', '15', '30'] as DaysFilter[]).map(opt => (
              <Button
                key={opt}
                type="button"
                size="sm"
                variant={daysFilter === opt ? 'default' : 'outline'}
                onClick={() => setDaysFilter(opt)}
              >
                {opt === 'all' ? 'All' : `${opt}+ days`}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Check-in From</Label>
          <Input type="date" value={checkInFrom} onChange={e => setCheckInFrom(e.target.value)} className="h-9" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Check-in To</Label>
          <Input type="date" value={checkInTo} onChange={e => setCheckInTo(e.target.value)} className="h-9" />
        </div>
        <div className="flex flex-col gap-1.5 min-w-[180px]">
          <Label className="text-xs">Company</Label>
          <Select value={companyFilter || '__all'} onValueChange={(v) => setCompanyFilter(v === '__all' ? '' : v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All</SelectItem>
              <SelectItem value="__none">No Company</SelectItem>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(daysFilter !== 'all' || checkInFrom || checkInTo || companyFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setDaysFilter('all'); setCheckInFrom(''); setCheckInTo(''); setCompanyFilter(''); }}>
            Clear Filters
          </Button>
        )}
      </div>

      {companyBreakdown.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {companyBreakdown.map(c => (
            <button
              key={c.key}
              onClick={() => setCompanyFilter(prev => prev === c.key ? '' : c.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${
                companyFilter === c.key ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-200 hover:border-emerald-300'
              }`}
            >
              <span className={companyFilter === c.key ? 'text-white' : 'text-gray-600'}>{c.name}</span>
              <span className={`font-bold ${companyFilter === c.key ? 'text-white' : 'text-destructive'}`}>{formatINR(c.pending)}</span>
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <LoadingState label="Loading pending dues..." />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={PartyPopper}
          title={allPendingRows.length === 0 ? 'No pending dues' : 'No dues match these filters'}
          description={allPendingRows.length === 0 ? "Everyone's settled up." : 'Try widening the date range or days-outstanding filter.'}
        />
      ) : (
        <DataTable columns={columns} data={rows} searchKey="guestName" />
      )}

      <EditBookingDialog booking={editingBooking} onOpenChange={(open) => !open && setEditingBooking(null)} />
      <RecordPaymentDialog booking={payingBooking} onOpenChange={(open) => !open && setPayingBooking(null)} />
    </div>
  );
}
