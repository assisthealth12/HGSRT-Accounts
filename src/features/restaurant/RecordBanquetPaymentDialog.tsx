import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/domain/money';
import { BanquetBooking, banquetReceived, banquetPending } from '@/domain/banquetBooking';
import { usePayments, useRecordPayment } from '@/hooks/usePayments';
import { usePaymentModes } from '@/hooks/usePaymentModes';
import { toast } from '@/hooks/use-toast';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function RecordBanquetPaymentDialog({
  booking,
  onOpenChange,
}: {
  booking: BanquetBooking | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: payments = [] } = usePayments(booking?.id);
  const { data: paymentModes = [] } = usePaymentModes();
  const { mutateAsync: recordPayment, isPending } = useRecordPayment();

  const [amount, setAmount] = useState('');
  const [paymentModeId, setPaymentModeId] = useState('');
  const [paidOn, setPaidOn] = useState(todayISO());
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');

  if (!booking) return null;

  const total = booking.quotedAmount;
  const received = banquetReceived(payments);
  const pending = banquetPending(booking, payments);

  const handleSave = async () => {
    if (!amount || !paymentModeId) return;
    const amountPaise = Math.round(parseFloat(amount) * 100);
    await recordPayment({
      bookingId: booking.id,
      amount: amountPaise,
      paymentModeId,
      paidOn,
      referenceNo: referenceNo.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setAmount(''); setPaymentModeId(''); setReferenceNo(''); setNotes('');
    toast({ title: 'Payment recorded', description: formatINR(amountPaise) });
  };

  return (
    <Dialog open={!!booking} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Payment — {booking.customerName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Total Quoted</div>
              <div className="font-bold">{formatINR(total)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Received</div>
              <div className="font-bold text-success">{formatINR(received)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Pending</div>
              <div className={`font-bold ${pending > 0 ? 'text-destructive' : 'text-success'}`}>{formatINR(pending)}</div>
            </div>
          </div>

          {pending === 0 ? (
            <Badge variant="outline" className="w-full justify-center py-2 text-success border-success">
              Fully Paid
            </Badge>
          ) : (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount (₹)</Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div>
                  <Label>Payment Mode</Label>
                  <Select value={paymentModeId} onValueChange={setPaymentModeId}>
                    <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                    <SelectContent>
                      {paymentModes.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Paid On</Label>
                  <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
                </div>
                <div>
                  <Label>Reference No.</Label>
                  <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="UTR / invoice no." />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleSave} disabled={isPending}>
                {isPending ? 'Saving...' : 'Add Payment'}
              </Button>
            </div>
          )}

          {payments.length > 0 && (
            <div className="border-t pt-4">
              <div className="text-sm font-medium mb-2">Payment History</div>
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{p.paidOn} · {paymentModes.find(m => m.id === p.paymentModeId)?.name || p.paymentModeId}</span>
                    <span className="font-medium">{formatINR(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
