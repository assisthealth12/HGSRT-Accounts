import React, { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatINR } from '@/domain/money';
import { BanquetSale } from '@/domain/banquet';
import { useBanquetSales, useCreateBanquetSale } from '@/hooks/useBanquetSales';

const columns: ColumnDef<BanquetSale>[] = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'eventName', header: 'Event' },
  {
    accessorKey: 'onlineAmount',
    header: 'Online',
    cell: ({ row }) => formatINR(row.original.onlineAmount),
  },
  {
    accessorKey: 'cashAmount',
    header: 'Cash',
    cell: ({ row }) => formatINR(row.original.cashAmount),
  },
  {
    id: 'total',
    header: 'Total',
    cell: ({ row }) => (
      <span className="font-bold">{formatINR(row.original.onlineAmount + row.original.cashAmount)}</span>
    ),
  },
];

export function BanquetPage() {
  const { data: sales = [], isLoading } = useBanquetSales();
  const { mutateAsync: createSale, isPending } = useCreateBanquetSale();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    eventName: '',
    onlineAmount: '',
    cashAmount: '',
  });

  const totalRevenue = sales.reduce((acc, s) => acc + s.onlineAmount + s.cashAmount, 0);

  const handleSubmit = async () => {
    if (!form.eventName.trim()) return;
    await createSale({
      date: form.date,
      eventName: form.eventName.trim(),
      onlineAmount: Math.round(parseFloat(form.onlineAmount || '0') * 100),
      cashAmount: Math.round(parseFloat(form.cashAmount || '0') * 100),
    });
    setForm({ date: new Date().toISOString().slice(0, 10), eventName: '', onlineAmount: '', cashAmount: '' });
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Banquet & Board Room Sales</h2>
          <p className="text-muted-foreground">Track event and board-room rental revenue.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>Log Sale</Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">Total Banquet Revenue</CardTitle>
          <div className="text-2xl font-bold text-primary">{formatINR(totalRevenue)}</div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading banquet sales...</div>
      ) : (
        <DataTable columns={columns} data={sales} searchKey="eventName" />
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Banquet Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Input placeholder="Event name" value={form.eventName} onChange={(e) => setForm({ ...form, eventName: e.target.value })} />
            <Input placeholder="Online amount (₹)" type="number" value={form.onlineAmount} onChange={(e) => setForm({ ...form, onlineAmount: e.target.value })} />
            <Input placeholder="Cash amount (₹)" type="number" value={form.cashAmount} onChange={(e) => setForm({ ...form, cashAmount: e.target.value })} />
            <Button className="w-full" onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
