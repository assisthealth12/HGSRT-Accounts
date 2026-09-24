import React, { useState } from 'react';
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

// Mock data
const mockStay = {
  id: 's1',
  roomNumber: '101',
  guestName: 'John Doe',
  checkIn: '2026-09-24',
  checkOut: '2026-09-26',
  status: 'In-House',
};

const mockCharges: Charge[] = [
  {
    id: 'chg1',
    propertyId: 'hotel-001',
    stayId: 's1',
    businessDate: '2026-09-24',
    type: 'Room',
    description: 'Room Rent - Night 1',
    baseAmount: 250000,
    discount: 0,
    taxableAmount: 250000,
    taxRatePercent: 12,
    taxAmount: { totalTax: 30000, cgst: 15000, sgst: 15000, igst: 0 },
    totalAmount: 280000, // ₹2800
    isVoided: false,
    createdAt: Date.now(),
    createdBy: 'night-audit',
    updatedAt: Date.now(),
    updatedBy: 'night-audit',
  },
  {
    id: 'chg2',
    propertyId: 'hotel-001',
    stayId: 's1',
    businessDate: '2026-09-24',
    type: 'Restaurant',
    description: 'Dinner - Table 4',
    baseAmount: 85000,
    discount: 0,
    taxableAmount: 85000,
    taxRatePercent: 5,
    taxAmount: { totalTax: 4250, cgst: 2125, sgst: 2125, igst: 0 },
    totalAmount: 89250, // ₹892.50
    isVoided: false,
    createdAt: Date.now(),
    createdBy: 'pos-user',
    updatedAt: Date.now(),
    updatedBy: 'pos-user',
  }
];

const mockPayments: Payment[] = [
  {
    id: 'pay1',
    propertyId: 'hotel-001',
    receiptNumber: 'RCPT-001',
    customerId: 'c1',
    amount: 1000000, // ₹10,000 Advance
    paymentDate: '2026-09-24',
    paymentMode: 'Card',
    referenceNumber: 'TXN123456',
    allocatedAmount: 0,
    unallocatedAmount: 1000000,
    status: 'Received',
    isReversed: false,
    createdAt: Date.now(),
    createdBy: 'admin',
    updatedAt: Date.now(),
    updatedBy: 'admin',
  }
];

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
  const navigate = useNavigate();

  // Aggregate calculations
  const totalCharges = mockCharges.reduce((acc, curr) => acc + (!curr.isVoided ? curr.totalAmount : 0), 0);
  const totalPayments = mockPayments.reduce((acc, curr) => acc + (!curr.isReversed ? curr.amount : 0), 0);
  const balance = totalCharges - totalPayments; // Positive means guest owes money, negative means we owe guest

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/stays')}>Back to Stays</Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Stay Folio: {mockStay.roomNumber}</h2>
            <p className="text-muted-foreground">Guest: {mockStay.guestName} | {mockStay.checkIn} to {mockStay.checkOut}</p>
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
            <CardTitle className="text-2xl">{formatINR(totalCharges)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Payments / Advances</CardDescription>
            <CardTitle className="text-2xl text-success">{formatINR(totalPayments)}</CardTitle>
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
              <DataTable columns={chargeColumns} data={mockCharges} />
            </TabsContent>
            <TabsContent value="payments">
              <DataTable columns={paymentColumns} data={mockPayments} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
