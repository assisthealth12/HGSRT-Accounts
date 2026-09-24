import React, { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatINR } from '@/domain/money';
import { Expense } from '@/domain/expense';

const mockExpenses: Expense[] = [
  {
    id: 'exp1',
    propertyId: 'hotel-001',
    category: 'Groceries',
    invoiceNumber: 'INV-2026-991',
    invoiceDate: '2026-09-23',
    items: [{ description: 'Milk & Bread', amount: 50000, totalAmount: 50000 }],
    subtotal: 50000,
    taxTotal: { totalTax: 0, cgst: 0, sgst: 0, igst: 0 },
    grandTotal: 50000,
    status: 'Pending Approval',
    isVoided: false,
    createdAt: Date.now(),
    createdBy: 'user',
    updatedAt: Date.now(),
    updatedBy: 'user',
  },
  {
    id: 'exp2',
    propertyId: 'hotel-001',
    category: 'Maintenance',
    invoiceNumber: 'MAINT-04',
    invoiceDate: '2026-09-20',
    items: [{ description: 'AC Repair Room 102', amount: 150000, totalAmount: 150000 }],
    subtotal: 150000,
    taxTotal: { totalTax: 0, cgst: 0, sgst: 0, igst: 0 },
    grandTotal: 150000,
    status: 'Paid',
    isVoided: false,
    createdAt: Date.now(),
    createdBy: 'user',
    updatedAt: Date.now(),
    updatedBy: 'user',
  }
];

const expenseColumns: ColumnDef<Expense>[] = [
  {
    accessorKey: 'invoiceDate',
    header: 'Date',
  },
  {
    accessorKey: 'category',
    header: 'Category',
  },
  {
    accessorKey: 'invoiceNumber',
    header: 'Invoice / Ref',
    cell: ({ row }) => row.original.invoiceNumber || '-',
  },
  {
    id: 'description',
    header: 'Description',
    cell: ({ row }) => row.original.items[0]?.description || 'Multiple Items',
  },
  {
    accessorKey: 'grandTotal',
    header: 'Amount',
    cell: ({ row }) => <span className="font-medium">{formatINR(row.original.grandTotal)}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      let variant: 'default' | 'outline' | 'secondary' | 'destructive' = 'outline';
      if (status === 'Pending Approval') variant = 'destructive';
      if (status === 'Approved') variant = 'secondary';
      if (status === 'Paid') variant = 'default';
      
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <Button variant="outline" size="sm">View</Button>
    ),
  },
];

export function ExpensesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Expenses & Accounts Payable</h2>
          <p className="text-muted-foreground">
            Manage daily hotel expenses and vendor invoices.
          </p>
        </div>
        <Button>Log Expense</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Pending Approvals</CardTitle>
            <div className="text-2xl font-bold text-destructive">{formatINR(50000)}</div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Approved (Unpaid)</CardTitle>
            <div className="text-2xl font-bold">{formatINR(0)}</div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Total Paid (This Month)</CardTitle>
            <div className="text-2xl font-bold text-success">{formatINR(150000)}</div>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Expenses</TabsTrigger>
              <TabsTrigger value="pending">Pending Approval</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <DataTable columns={expenseColumns} data={mockExpenses} />
            </TabsContent>
            {/* Other tab contents would filter the data appropriately */}
            <TabsContent value="pending">
              <DataTable columns={expenseColumns} data={mockExpenses.filter(e => e.status === 'Pending Approval')} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
