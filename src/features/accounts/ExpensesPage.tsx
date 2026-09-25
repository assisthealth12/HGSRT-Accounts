import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatINR } from '@/domain/money';
import { Expense } from '@/domain/expense';
import { useExpenses } from '@/hooks/useExpenses';

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
];

export function ExpensesPage() {
  const { data: expenses = [], isLoading } = useExpenses();

  const now = new Date();
  const thisMonth = expenses.filter(e => {
    const d = new Date(e.invoiceDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const pendingApprovalTotal = expenses
    .filter(e => e.status === 'Pending Approval')
    .reduce((acc, e) => acc + e.grandTotal, 0);

  const approvedUnpaidTotal = expenses
    .filter(e => e.status === 'Approved')
    .reduce((acc, e) => acc + e.grandTotal, 0);

  const paidThisMonthTotal = thisMonth
    .filter(e => e.status === 'Paid')
    .reduce((acc, e) => acc + e.grandTotal, 0);

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
            <div className="text-2xl font-bold text-destructive">{formatINR(pendingApprovalTotal)}</div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Approved (Unpaid)</CardTitle>
            <div className="text-2xl font-bold">{formatINR(approvedUnpaidTotal)}</div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Total Paid (This Month)</CardTitle>
            <div className="text-2xl font-bold text-success">{formatINR(paidThisMonthTotal)}</div>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading expenses...</div>
          ) : (
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Expenses</TabsTrigger>
                <TabsTrigger value="pending">Pending Approval</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="paid">Paid</TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                <DataTable columns={expenseColumns} data={expenses} />
              </TabsContent>
              <TabsContent value="pending">
                <DataTable columns={expenseColumns} data={expenses.filter(e => e.status === 'Pending Approval')} />
              </TabsContent>
              <TabsContent value="approved">
                <DataTable columns={expenseColumns} data={expenses.filter(e => e.status === 'Approved')} />
              </TabsContent>
              <TabsContent value="paid">
                <DataTable columns={expenseColumns} data={expenses.filter(e => e.status === 'Paid')} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
