import React, { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatINR } from '@/domain/money';
import { Expense } from '@/domain/expense';
import { useExpenses, useCreateExpense } from '@/hooks/useExpenses';
import { useExpenseCategories, useCreateExpenseCategory } from '@/hooks/useExpenseCategories';
import { usePaymentModes } from '@/hooks/usePaymentModes';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { toast } from '@/hooks/use-toast';
import { Receipt } from 'lucide-react';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function AddExpenseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: categories = [] } = useExpenseCategories();
  const { data: paymentModes = [] } = usePaymentModes();
  const { mutateAsync: createExpense, isPending } = useCreateExpense();

  const [categoryId, setCategoryId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [description, setDescription] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [orderDate, setOrderDate] = useState(todayISO());
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentModeId, setPaymentModeId] = useState('');
  const [paidOn, setPaidOn] = useState(todayISO());
  const [referenceNo, setReferenceNo] = useState('');

  const reset = () => {
    setCategoryId(''); setVendorName(''); setDescription('');
    setBillAmount(''); setOrderDate(todayISO()); setDeliveryDate(''); setPaymentModeId(''); setPaidOn(todayISO()); setReferenceNo('');
  };

  const handleSave = async () => {
    if (!categoryId || !vendorName.trim() || !billAmount || !paymentModeId) return;
    await createExpense({
      categoryId,
      vendorName: vendorName.trim(),
      description: description.trim() || undefined,
      billAmount: Math.round(parseFloat(billAmount) * 100),
      orderDate,
      deliveryDate: deliveryDate || undefined,
      paymentModeId,
      paidOn,
      referenceNo: referenceNo.trim() || undefined,
    });
    toast({ title: 'Expense added', description: `${vendorName.trim()} — ${formatINR(Math.round(parseFloat(billAmount) * 100))}` });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-0 rounded-2xl shadow-2xl">
        <div className="bg-emerald-600 p-6 text-white rounded-t-2xl">
          <DialogTitle className="text-2xl font-extrabold flex items-center gap-2">
            <Receipt className="w-6 h-6" />
            Add New Expense
          </DialogTitle>
          <p className="text-emerald-100 mt-1 text-sm">Log a vendor payment or operational purchase</p>
        </div>
        
        <div className="p-6 space-y-8 bg-gray-50/50">
          
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 block">Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-gray-200"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.length === 0 && <div className="p-2 text-sm text-gray-500">Add categories in Admin Settings</div>}
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 block">Vendor Name</Label>
                <Input className="h-12 rounded-xl bg-gray-50 border-gray-200" value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="e.g. Metro Cash & Carry" />
              </div>
            </div>
            
            <div>
              <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 block">Description (Optional)</Label>
              <Input className="h-12 rounded-xl bg-gray-50 border-gray-200" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was purchased?" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 block">Bill Amount (₹)</Label>
                <Input className="h-12 rounded-xl bg-gray-50 border-gray-200 text-lg font-bold" type="number" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 block">Payment Mode</Label>
                <Select value={paymentModeId} onValueChange={setPaymentModeId}>
                  <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-gray-200"><SelectValue placeholder="Select mode" /></SelectTrigger>
                  <SelectContent>
                    {paymentModes.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 block">Order Date</Label>
                <Input className="h-12 rounded-xl bg-gray-50 border-gray-200" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 block">Delivery Date</Label>
                <Input className="h-12 rounded-xl bg-gray-50 border-gray-200" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 block">Paid On</Label>
                <Input className="h-12 rounded-xl bg-gray-50 border-gray-200" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
              </div>
              <div>
                <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 block">Transaction ID (Optional)</Label>
                <Input className="h-12 rounded-xl bg-gray-50 border-gray-200" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="UTR / Txn ID" />
              </div>
            </div>
          </div>

          <Button 
            className="w-full h-14 rounded-xl text-lg font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20" 
            onClick={handleSave} 
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Confirm & Save Expense'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExpenseListTab() {
  const { data: expenses = [], isLoading } = useExpenses();
  const { data: categories = [] } = useExpenseCategories();

  const categoryName = (id: string) => categories.find(c => c.id === id)?.name || id;
  const runningTotal = expenses.reduce((acc, e) => acc + e.billAmount, 0);

  const columns: ColumnDef<Expense>[] = [
    { accessorKey: 'paidOn', header: 'Date' },
    { id: 'category', header: 'Category', cell: ({ row }) => categoryName(row.original.categoryId) },
    { accessorKey: 'vendorName', header: 'Vendor' },
    { accessorKey: 'description', header: 'Description', cell: ({ row }) => row.original.description || '-' },
    { accessorKey: 'billAmount', header: 'Amount', cell: ({ row }) => formatINR(row.original.billAmount) },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">Total ({expenses.length} expenses)</CardTitle>
          <div className="text-2xl font-bold text-primary">{formatINR(runningTotal)}</div>
        </CardHeader>
      </Card>
      {isLoading ? (
        <LoadingState label="Loading expenses..." />
      ) : expenses.length === 0 ? (
        <EmptyState icon={Receipt} title="No expenses logged yet" />
      ) : (
        <DataTable columns={columns} data={expenses} searchKey="vendorName" />
      )}
    </div>
  );
}

function CategoryBreakdownTab() {
  const { data: expenses = [] } = useExpenses();
  const { data: categories = [] } = useExpenseCategories();

  const breakdown = useMemo(() => {
    const totals = new Map<string, number>();
    expenses.forEach(e => totals.set(e.categoryId, (totals.get(e.categoryId) || 0) + e.billAmount));
    return categories
      .map(c => ({ name: c.name, total: totals.get(c.id) || 0 }))
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [expenses, categories]);

  return (
    <div className="space-y-3">
      {breakdown.length === 0 ? (
        <EmptyState icon={Receipt} title="No expenses recorded yet" />
      ) : (
        breakdown.map(c => (
          <Card key={c.name}>
            <CardContent className="flex justify-between items-center py-4">
              <span className="font-medium">{c.name}</span>
              <span className="font-bold">{formatINR(c.total)}</span>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

export function ExpensesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Receipt}
        title="Expenses"
        description="Vendor bills and purchases."
        actions={<Button onClick={() => setIsDialogOpen(true)}>Add Expense</Button>}
      />

      <Tabs defaultValue="list">
        <TabsList className="mb-4">
          <TabsTrigger value="list">Expense List</TabsTrigger>
          <TabsTrigger value="breakdown">Category Breakdown</TabsTrigger>
        </TabsList>
        <TabsContent value="list"><ExpenseListTab /></TabsContent>
        <TabsContent value="breakdown"><CategoryBreakdownTab /></TabsContent>
      </Tabs>

      <AddExpenseDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
