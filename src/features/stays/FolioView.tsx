import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatINR } from '@/domain/money';
import { Charge } from '@/domain/charge';
import { Payment } from '@/domain/payment';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStay } from '@/hooks/useStay';
import { useCharges } from '@/hooks/useCharges';
import { usePayments } from '@/hooks/usePayments';
import { useRooms } from '@/hooks/useRooms';
import { totalCharges as sumCharges, totalPayments as sumPayments } from '@/domain/folio';

const chargeColumns: ColumnDef<Charge>[] = [
  {
    accessorKey: 'businessDate',
    header: 'Date',
  },
  {
    accessorKey: 'type',
    header: 'Type',
  },
  {
    accessorKey: 'description',
    header: 'Description',
  },
  {
    accessorKey: 'totalAmount',
    header: 'Amount',
    cell: ({ row }) => <span className="font-medium">{formatINR(row.original.totalAmount)}</span>,
  },
  {
    accessorKey: 'isVoided',
    header: 'Status',
    cell: ({ row }) => row.original.isVoided ? <Badge variant="destructive">Voided</Badge> : <Badge variant="outline">Posted</Badge>,
  },
];

const paymentColumns: ColumnDef<Payment>[] = [
  {
    accessorKey: 'paymentDate',
    header: 'Date',
  },
  {
    accessorKey: 'receiptNumber',
    header: 'Receipt No.',
  },
  {
    accessorKey: 'paymentMode',
    header: 'Mode',
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => <span className="font-bold text-success">{formatINR(row.original.amount)}</span>,
  },
];

export function FolioView() {
  const { stayId } = useParams<{ stayId: string }>();
  const navigate = useNavigate();

  const { data: stay, isLoading: isLoadingStay } = useStay(stayId);
  const { data: charges = [], isLoading: isLoadingCharges } = useCharges(stayId);
  const { data: payments = [], isLoading: isLoadingPayments } = usePayments(stay?.customerId);
  const { data: rooms = [] } = useRooms();

  const isLoading = isLoadingStay || isLoadingCharges || isLoadingPayments;

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Loading folio...</div>;
  }

  if (!stay) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate('/stays')}>Back to Stays</Button>
        <div className="py-12 text-center text-muted-foreground">Stay not found.</div>
      </div>
    );
  }

  const roomNumber = rooms.find(r => r.id === stay.roomAssignments[0]?.roomId)?.roomNumber || 'N/A';
  const guestName = stay.guests[0]?.name || 'Unknown Guest';

  const totalChargesAmount = sumCharges(charges);
  const totalPaymentsAmount = sumPayments(payments);
  const balance = totalChargesAmount - totalPaymentsAmount;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/stays')}>Back to Stays</Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Stay Folio: {roomNumber}</h2>
            <p className="text-muted-foreground">Guest: {guestName} | {stay.checkInDate} to {stay.expectedCheckOutDate}</p>
          </div>
        </div>
        <div className="space-x-2">
          <Button variant="secondary">Post Charge</Button>
          <Button variant="default">Receive Payment</Button>
          <Button variant="outline">Generate Proforma</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Charges</CardDescription>
            <CardTitle className="text-2xl">{formatINR(totalChargesAmount)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Payments / Advances</CardDescription>
            <CardTitle className="text-2xl text-success">{formatINR(totalPaymentsAmount)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={balance > 0 ? 'border-destructive' : 'border-success'}>
          <CardHeader className="pb-2">
            <CardDescription>Balance Outstanding</CardDescription>
            <CardTitle className={`text-3xl ${balance > 0 ? 'text-destructive' : 'text-success'}`}>
              {formatINR(balance)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Folio Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="charges">
            <TabsList className="mb-4">
              <TabsTrigger value="charges">Charges</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>
            <TabsContent value="charges">
              <DataTable columns={chargeColumns} data={charges} />
            </TabsContent>
            <TabsContent value="payments">
              <DataTable columns={paymentColumns} data={payments} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
