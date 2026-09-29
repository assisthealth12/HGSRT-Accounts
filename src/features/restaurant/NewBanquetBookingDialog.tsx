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
import { formatINR } from '@/domain/money';
import { useCreateBanquetBooking } from '@/hooks/useBanquetBookings';
import { usePaymentModes } from '@/hooks/usePaymentModes';
import { useRecordPayment } from '@/hooks/usePayments';
import { toast } from '@/hooks/use-toast';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function NewBanquetBookingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { mutateAsync: createBooking, isPending } = useCreateBanquetBooking();
  const { data: paymentModes = [] } = usePaymentModes();
  const { mutateAsync: recordPayment, isPending: isPaymentPending } = useRecordPayment();

  const [customerName, setCustomerName] = useState('');
  const [eventDate, setEventDate] = useState(todayISO());
  const [eventType, setEventType] = useState('Wedding');
  const [quotedAmount, setQuotedAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [paymentModeId, setPaymentModeId] = useState('');
  const [paidOn, setPaidOn] = useState(todayISO());
  const [referenceNo, setReferenceNo] = useState('');
  const [error, setError] = useState('');

  const quotedCents = Math.round(parseFloat(quotedAmount || '0') * 100);
  const advanceCents = Math.round(parseFloat(advanceAmount || '0') * 100);
  const balance = quotedCents - advanceCents;

  const reset = () => {
    setCustomerName(''); setEventDate(todayISO()); setEventType('Wedding');
    setQuotedAmount(''); setRemarks(''); setAdvanceAmount(''); setPaymentModeId(''); setPaidOn(todayISO()); setReferenceNo(''); setError('');
  };

  const handleSave = async () => {
    setError('');
    if (!customerName.trim() || !quotedAmount) {
      setError('Customer name and quoted amount are required.');
      return;
    }
    
    if (advanceCents > 0 && !paymentModeId) {
      setError('Please select a payment mode for the advance payment.');
      return;
    }
    
    try {
      const created = await createBooking({
        customerName: customerName.trim(),
        eventDate,
        eventType,
        quotedAmount: quotedCents,
        remarks: remarks.trim() || undefined,
      });

      if (advanceCents > 0) {
        await recordPayment({
          bookingId: created.id, // we reuse useRecordPayment!
          amount: advanceCents,
          paymentModeId,
          paidOn: paidOn,
          referenceNo: referenceNo.trim() || undefined,
          notes: 'Advance Payment',
        });
      }

      toast({ title: 'Banquet Event Booked', description: `${customerName.trim()} — ${formatINR(quotedCents)}` });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to create booking');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Banquet Event</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Customer Name</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div>
              <Label>Event Type</Label>
              <Input value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="e.g. Wedding, Birthday, Corporate" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Event Date</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div>
              <Label>Total Quoted Amount (₹)</Label>
              <Input type="number" value={quotedAmount} onChange={(e) => setQuotedAmount(e.target.value)} />
            </div>
          </div>
          
          <div>
            <Label>Remarks (optional)</Label>
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Any special requests or details" />
          </div>
          
          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-3">Advance Payment (optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount Paid (₹)</Label>
                <Input type="number" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} />
              </div>
              <div>
                <Label>Payment Mode</Label>
                <Select value={paymentModeId} onValueChange={setPaymentModeId}>
                  <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                  <SelectContent>
                    {paymentModes.filter(m => m.active).map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Paid On</Label>
                <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
              </div>
              <div>
                <Label>Transaction ID</Label>
                <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Optional" />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <div>
              <div className="text-sm font-bold text-gray-900">Total Quoted: {formatINR(quotedCents)}</div>
              {advanceCents > 0 && (
                <div className="text-sm text-green-600 font-bold">Paid: {formatINR(advanceCents)}</div>
              )}
              <div className="text-lg font-bold text-green-600">
                Pending: {formatINR(balance)}
              </div>
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
          </div>

          <Button 
            className="w-full" 
            onClick={handleSave} 
            disabled={isPending || isPaymentPending}
          >
            {isPending || isPaymentPending ? 'Saving...' : 'Save Banquet Booking'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
