import React, { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/domain/money';
import { computeBalance } from '@/domain/folio';
import { useStays } from '@/hooks/useStays';
import { useCharges } from '@/hooks/useCharges';
import { usePayments } from '@/hooks/usePayments';
import { useRooms } from '@/hooks/useRooms';
import { useNavigate } from 'react-router-dom';

interface PendingDueRow {
  stayId: string;
  guestName: string;
  roomNumber: string;
  checkInDate: string;
  expectedCheckOutDate: string;
  balance: number;
}

export function PendingDuesPage() {
  const navigate = useNavigate();
  const { data: stays = [], isLoading: isLoadingStays } = useStays();
  const { data: charges = [], isLoading: isLoadingCharges } = useCharges();
  const { data: payments = [], isLoading: isLoadingPayments } = usePayments();
  const { data: rooms = [] } = useRooms();

  const isLoading = isLoadingStays || isLoadingCharges || isLoadingPayments;

  const rows = useMemo<PendingDueRow[]>(() => {
    const chargesByStay = new Map<string, typeof charges>();
    charges.forEach(c => {
      chargesByStay.set(c.stayId, [...(chargesByStay.get(c.stayId) || []), c]);
    });

    const paymentsByCustomer = new Map<string, typeof payments>();
    payments.forEach(p => {
      paymentsByCustomer.set(p.customerId, [...(paymentsByCustomer.get(p.customerId) || []), p]);
    });

    return stays
      .map((stay) => {
        const stayCharges = chargesByStay.get(stay.id) || [];
        const customerPayments = paymentsByCustomer.get(stay.customerId) || [];
        const balance = computeBalance(stayCharges, customerPayments);
        const roomNumber = rooms.find(r => r.id === stay.roomAssignments[0]?.roomId)?.roomNumber || 'N/A';

        return {
          stayId: stay.id,
          guestName: stay.guests[0]?.name || 'Unknown Guest',
          roomNumber,
          checkInDate: stay.checkInDate,
          expectedCheckOutDate: stay.expectedCheckOutDate,
          balance,
        };
      })
      .filter(row => row.balance > 0)
      .sort((a, b) => b.balance - a.balance);
  }, [stays, charges, payments, rooms]);

  const totalPending = rows.reduce((acc, r) => acc + r.balance, 0);

  const columns: ColumnDef<PendingDueRow>[] = [
    { accessorKey: 'guestName', header: 'Guest' },
    { accessorKey: 'roomNumber', header: 'Room' },
    { accessorKey: 'checkInDate', header: 'Check-In' },
    { accessorKey: 'expectedCheckOutDate', header: 'Expected Check-Out' },
    {
      accessorKey: 'balance',
      header: 'Pending Amount',
      cell: ({ row }) => <span className="font-bold text-destructive">{formatINR(row.original.balance)}</span>,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => navigate(`/stays/${row.original.stayId}`)}>
          Open Folio
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pending Dues</h2>
        <p className="text-muted-foreground">
          Guests with an outstanding balance across all stays. Total pending: <span className="font-bold text-destructive">{formatINR(totalPending)}</span>
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading pending dues...</div>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No pending dues. Everyone's settled up.</div>
      ) : (
        <DataTable columns={columns} data={rows} searchKey="guestName" />
      )}
    </div>
  );
}
