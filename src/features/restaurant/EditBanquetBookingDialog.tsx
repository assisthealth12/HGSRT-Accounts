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
import { BanquetBooking } from '@/domain/banquetBooking';
import { useUpdateBanquetBooking } from '@/hooks/useBanquetBookings';
import { toast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export function EditBanquetBookingDialog({ booking, onOpenChange }: { booking: BanquetBooking | null; onOpenChange: (open: boolean) => void }) {
  const { mutateAsync: updateBooking, isPending } = useUpdateBanquetBooking();

  const [customerName, setCustomerName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState('');
  const [quotedAmount, setQuotedAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (booking) {
      setCustomerName(booking.customerName);
      setEventDate(booking.eventDate);
      setEventType(booking.eventType);
      setQuotedAmount((booking.quotedAmount / 100).toString());
      setRemarks(booking.remarks || '');
      setError('');
    }
  }, [booking]);

  const quotedCents = Math.round(parseFloat(quotedAmount || '0') * 100);

  const handleSave = async () => {
    setError('');
    if (!customerName.trim() || !quotedAmount) {
      setError('Customer name and quoted amount are required.');
      return;
    }
    

    
    try {
      await updateBooking({
        id: booking!.id,
        customerName: customerName.trim(),
        eventDate,
        eventType,
        quotedAmount: quotedCents,
        remarks: remarks.trim() || undefined,
      });

      toast({ title: 'Event Updated', description: `${customerName.trim()} — ${formatINR(quotedCents)}` });
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to update booking');
    }
  };

  return (
    <Dialog open={!!booking} onOpenChange={(o) => { onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Banquet Event</DialogTitle>
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
          
          <div className="flex justify-between items-center pt-2 border-t mt-6">
            <div>
              <div className="text-sm font-bold text-gray-900">Total Quoted: {formatINR(quotedCents)}</div>
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
          </div>

          <Button 
            className="w-full mt-4" 
            onClick={handleSave} 
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Save Banquet Booking'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
