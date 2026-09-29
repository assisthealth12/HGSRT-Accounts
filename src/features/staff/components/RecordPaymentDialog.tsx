import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatINR } from '@/domain/money';
import { Staff } from '@/domain/staff';
import { useRecordPayrollPayment } from '@/hooks/usePayrollPayments';
import { usePaymentModes } from '@/hooks/usePaymentModes';
import { toast } from '@/hooks/use-toast';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function RecordPaymentDialog({ staffMember, onOpenChange }: { staffMember: Staff | null; onOpenChange: (open: boolean) => void }) {
  const { data: paymentModes = [] } = usePaymentModes();
  const { mutateAsync: recordPayment, isPending } = useRecordPayrollPayment();
  const [amount, setAmount] = useState('');
  const [paymentModeId, setPaymentModeId] = useState('');
  const [paidOn, setPaidOn] = useState(todayISO());
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');

  if (!staffMember) return null;

  const handleSave = async () => {
    if (!amount || !paymentModeId) return;
    const amountPaise = Math.round(parseFloat(amount) * 100);
    await recordPayment({
      staffId: staffMember.id,
      amount: amountPaise,
      paymentModeId,
      paidOn,
      referenceNo: referenceNo.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setAmount(''); setPaymentModeId(''); setReferenceNo(''); setNotes('');
    onOpenChange(false);
    toast({ title: 'Payment recorded', description: `${staffMember.name} — ${formatINR(amountPaise)}` });
  };

  return (
    <Dialog open={!!staffMember} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payroll Payment — {staffMember.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Amount (₹)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Paid Via</Label>
            <Select value={paymentModeId} onValueChange={setPaymentModeId}>
              <SelectTrigger><SelectValue placeholder="Select mode (e.g. GRV, GSR, Cash, Bank)" /></SelectTrigger>
              <SelectContent>
                {paymentModes.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Paid On</Label>
              <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
            </div>
            <div>
              <Label>Transaction ID (Optional)</Label>
              <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="UTR / Txn ID" />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving...' : 'Record Payment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
