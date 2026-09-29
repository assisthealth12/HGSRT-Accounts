import React, { useMemo, useState } from 'react';
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
import { bookingTotal, datesOverlap, Occupancy } from '@/domain/booking';
import { useRooms } from '@/hooks/useRooms';
import { useRoomTypes } from '@/hooks/useRoomTypes';
import { useBookings, useCreateBooking } from '@/hooks/useBookings';
import { usePaymentModes } from '@/hooks/usePaymentModes';
import { useRecordPayment } from '@/hooks/usePayments';
import { toast } from '@/hooks/use-toast';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function nightsBetween(checkIn: string, checkOut: string) {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function NewBookingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: rooms = [] } = useRooms();
  const { data: roomTypes = [] } = useRoomTypes();
  const { data: bookings = [] } = useBookings();
  const { data: paymentModes = [] } = usePaymentModes();
  const { mutateAsync: createBooking, isPending } = useCreateBooking();
  const { mutateAsync: recordPayment, isPending: isPaymentPending } = useRecordPayment();

  const [guestName, setGuestName] = useState('');
  const [occupancy, setOccupancy] = useState<Occupancy>('Single');
  const [checkIn, setCheckIn] = useState(todayISO());
  const [checkOut, setCheckOut] = useState(todayISO());
  const [roomIds, setRoomIds] = useState<string[]>([]);
  const [tariff, setTariff] = useState('');
  const [discount, setDiscount] = useState('');
  const [gst, setGst] = useState('');
  const [addonAmount, setAddonAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentModeId, setPaymentModeId] = useState('');
  const [paidOn, setPaidOn] = useState(todayISO());
  const [referenceNo, setReferenceNo] = useState('');
  const [error, setError] = useState('');

  const availableRooms = useMemo(() => {
    return rooms.filter(room => {
      const conflict = bookings.some(b => b.roomIds?.includes(room.id) && datesOverlap(checkIn, checkOut, b.checkIn, b.checkOut));
      return !conflict;
    });
  }, [rooms, bookings, checkIn, checkOut]);

  const nights = nightsBetween(checkIn, checkOut);
  
  const toggleRoom = (id: string) => {
    setRoomIds(prev => {
      const next = prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id];
      // Auto-calculate tariff
      const totalTariffCents = next.reduce((sum, rId) => {
        const r = rooms.find(room => room.id === rId);
        return sum + (r?.baseTariff || 0);
      }, 0);
      // setTariff as string in rupees, multiplied by nights
      if (totalTariffCents > 0) {
        setTariff((totalTariffCents * nights / 100).toString());
      } else {
        setTariff('');
      }
      return next;
    });
  };

  const tariffCents = Math.round(parseFloat(tariff || '0') * 100);
  const gstPercentage = parseFloat(gst || '0');
  const gstCents = Math.round(tariffCents * (gstPercentage / 100));
  const addonCents = Math.round(parseFloat(addonAmount || '0') * 100);
  const discountCents = Math.round(parseFloat(discount || '0') * 100);

  const total = bookingTotal({
    tariff: tariffCents,
    gst: gstCents,
    addonAmount: addonCents,
    discount: discountCents,
  });
  const amountPaidCents = Math.round(parseFloat(amountPaid || '0') * 100);
  const balance = total - amountPaidCents;

  const reset = () => {
    setGuestName(''); setOccupancy('Single'); setCheckIn(todayISO()); setCheckOut(todayISO());
    setRoomIds([]); setTariff(''); setDiscount(''); setGst(''); setAddonAmount(''); setRemarks(''); 
    setAmountPaid(''); setPaymentModeId(''); setPaidOn(todayISO()); setReferenceNo(''); setError('');
  };

  const handleSave = async () => {
    setError('');
    if (!guestName.trim() || roomIds.length === 0 || !tariff) {
      setError('Guest name, at least one room, and tariff are required.');
      return;
    }
    
    if (amountPaidCents > 0 && !paymentModeId) {
      setError('Please select a payment mode for the amount paid.');
      return;
    }
    
    try {
      const created = await createBooking({
        guestName: guestName.trim(),
        occupancy,
        roomIds,
        checkIn,
        checkOut,
        nights,
        tariff: tariffCents,
        gst: gstCents,
        addonAmount: addonCents,
        discount: discountCents,
        remarks: remarks.trim() || undefined,
      });

      if (amountPaidCents > 0) {
        await recordPayment({
          bookingId: created.id,
          amount: amountPaidCents,
          paymentModeId,
          paidOn: paidOn,
          referenceNo: referenceNo.trim() || undefined,
          notes: 'Advance Payment',
        });
      }

      toast({ title: 'Booking created', description: `${guestName.trim()} — ${formatINR(total)}` });
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
          <DialogTitle>New Booking</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Guest Name</Label>
            <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Check-In</Label>
              <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div>
              <Label>Check-Out</Label>
              <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Occupancy</Label>
              <Select value={occupancy} onValueChange={(v) => setOccupancy(v as Occupancy)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Double">Double</SelectItem>
                  <SelectItem value="Triple">Triple</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label className="mb-2 block">Rooms ({availableRooms.length} available)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
              {availableRooms.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleRoom(r.id)}
                  className={`px-3 py-2 border rounded-xl text-sm text-left transition-colors ${roomIds.includes(r.id) ? 'bg-emerald-100 border-emerald-500 shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="font-bold text-gray-900">{r.roomNumber}</div>
                  <div className="text-xs text-gray-500 truncate">{roomTypes.find(t => t.id === r.roomTypeId)?.name}</div>
                </button>
              ))}
              {availableRooms.length === 0 && (
                <div className="col-span-full text-sm text-gray-500 text-center py-4 border rounded-xl border-dashed">
                  No rooms available for these dates
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Tariff (₹)</Label>
              <Input type="number" value={tariff} onChange={(e) => setTariff(e.target.value)} />
            </div>
            <div>
              <Label>Discount (₹)</Label>
              <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div>
              <Label>GST (%)</Label>
              <Input type="number" value={gst} onChange={(e) => setGst(e.target.value)} />
            </div>
            <div>
              <Label>Addon (₹)</Label>
              <Input type="number" value={addonAmount} onChange={(e) => setAddonAmount(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Remarks (optional)</Label>
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
          
          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-3">Advance Payment (optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount Paid (₹)</Label>
                <Input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
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
              <div className="text-sm text-muted-foreground">{nights} night(s) &bull; {roomIds.length} room(s)</div>
              <div className="text-sm font-semibold">Total: {formatINR(total)}</div>
              {amountPaidCents > 0 && (
                <div className="text-sm text-muted-foreground">Paid: {formatINR(amountPaidCents)}</div>
              )}
              {discountCents > 0 && (
                <div className="text-sm text-muted-foreground">Discount: {formatINR(discountCents)}</div>
              )}
              <div className={`text-lg font-bold ${balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                Balance: {formatINR(balance)}
              </div>
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
          </div>
          <Button className="w-full" onClick={handleSave} disabled={isPending || isPaymentPending}>
            {isPending || isPaymentPending ? 'Saving...' : 'Save Booking'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
