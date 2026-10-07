import React, { useMemo, useState, useEffect } from 'react';
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
import { rateFor, mealPlanDeltaFor, MealPlan } from '@/domain/room';
import { useRooms } from '@/hooks/useRooms';
import { useRoomTypes } from '@/hooks/useRoomTypes';
import { useBookings, useCreateBooking } from '@/hooks/useBookings';
import { usePaymentModes } from '@/hooks/usePaymentModes';
import { useRecordPayment } from '@/hooks/usePayments';
import { useAddons, Addon } from '@/hooks/useAddons';
import { toast } from '@/hooks/use-toast';
import { Check, Plus } from 'lucide-react';

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
  const [mealPlan, setMealPlan] = useState<MealPlan>('EP');
  const [checkIn, setCheckIn] = useState(todayISO());
  const [checkOut, setCheckOut] = useState(todayISO());
  const [roomIds, setRoomIds] = useState<string[]>([]);
  const [roomAddons, setRoomAddons] = useState<Record<string, { id: string; name: string; price: number }[]>>({});
  const [tariff, setTariff] = useState('');
  const [discount, setDiscount] = useState('');
  const [gst, setGst] = useState('');
  const [addonAmount, setAddonAmount] = useState('');
  const [mealPlanAmount, setMealPlanAmount] = useState('');
  const [mealPlanGstPercent, setMealPlanGstPercent] = useState('');
  const [remarks, setRemarks] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentModeId, setPaymentModeId] = useState('');
  const [paidOn, setPaidOn] = useState(todayISO());
  const [referenceNo, setReferenceNo] = useState('');
  const [error, setError] = useState('');

  const { data: addons = [] } = useAddons();

  const availableRooms = useMemo(() => {
    return rooms.filter(room => {
      const conflict = bookings.some(b => b.roomIds?.includes(room.id) && datesOverlap(checkIn, checkOut, b.checkIn, b.checkOut));
      return !conflict;
    });
  }, [rooms, bookings, checkIn, checkOut]);

  const nights = nightsBetween(checkIn, checkOut);
  
  // Addon amount is derived from roomAddons, never stored/typed-over — recompute it
  // right at the point roomAddons changes instead of via an effect (an effect keyed
  // on roomAddons would also need to special-case the initial empty state and can
  // lag a render behind the chip's own visual toggle).
  const recalcAddonAmount = (updated: Record<string, { id: string; name: string; price: number }[]>) => {
    const totalAddonsCents = Object.values(updated).flat().reduce((sum, a) => sum + a.price, 0);
    setAddonAmount(totalAddonsCents > 0 ? ((totalAddonsCents * nights) / 100).toString() : '');
  };

  const toggleRoom = (id: string) => {
    setRoomIds(prev => {
      if (prev.includes(id)) {
        setRoomAddons(curr => {
          const copy = { ...curr };
          delete copy[id];
          recalcAddonAmount(copy);
          return copy;
        });
        return prev.filter(r => r !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const toggleAddon = (roomId: string, addon: Addon) => {
    setRoomAddons(prev => {
      const roomAddonList = prev[roomId] || [];
      const isSelected = roomAddonList.some(a => a.id === addon.id);

      const updated = isSelected
        ? { ...prev, [roomId]: roomAddonList.filter(a => a.id !== addon.id) }
        : { ...prev, [roomId]: [...roomAddonList, { id: addon.id, name: addon.name, price: addon.price }] };

      recalcAddonAmount(updated);
      return updated;
    });
  };

  // Tariff is looked up per room from its Room Type's rate matrix (by occupancy +
  // meal plan), falling back to the room's flat Base Tariff if that type has no
  // rates configured yet.
  useEffect(() => {
    const totalTariffCents = roomIds.reduce((sum, rId) => {
      const r = rooms.find(room => room.id === rId);
      if (!r) return sum;
      const rt = roomTypes.find(t => t.id === r.roomTypeId);
      return sum + rateFor(rt, occupancy, mealPlan, r.baseTariff);
    }, 0);
    setTariff(totalTariffCents > 0 ? (totalTariffCents * nights / 100).toString() : '');
  }, [roomIds, nights, rooms, roomTypes, occupancy, mealPlan]);

  // When CP (Room + Breakfast) is picked, suggest the Meal Plan Allocation as the
  // CP−EP rate difference across selected rooms — still a plain editable field,
  // so staff can adjust it afterward. Switching back to EP clears the suggestion.
  useEffect(() => {
    if (mealPlan !== 'CP') {
      setMealPlanAmount('');
      return;
    }
    const totalDeltaCents = roomIds.reduce((sum, rId) => {
      const r = rooms.find(room => room.id === rId);
      if (!r) return sum;
      const rt = roomTypes.find(t => t.id === r.roomTypeId);
      return sum + mealPlanDeltaFor(rt, occupancy);
    }, 0);
    setMealPlanAmount(totalDeltaCents > 0 ? (totalDeltaCents * nights / 100).toString() : '');
  }, [roomIds, nights, rooms, roomTypes, occupancy, mealPlan]);

  // Nights can change (check-in/out edited) after addons are already selected —
  // keep the addon total in sync with the current selection in that case too.
  useEffect(() => {
    recalcAddonAmount(roomAddons);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nights]);

  const tariffCents = Math.round(parseFloat(tariff || '0') * 100);
  const addonCents = Math.round(parseFloat(addonAmount || '0') * 100);
  const gstPercentage = parseFloat(gst || '0');
  // GST applies to Tariff + Addons (e.g. extra bed), not Tariff alone.
  const gstCents = Math.round((tariffCents + addonCents) * (gstPercentage / 100));
  // Discount is a % of Tariff (same pattern as GST), not a flat ₹ amount. Clamped
  // defensively to 0-100 even though the input already blocks out-of-range values.
  const discountPercentage = Math.min(100, Math.max(0, parseFloat(discount || '0')));
  const discountCents = Math.round(tariffCents * (discountPercentage / 100));
  const mealPlanAmountCents = Math.round(parseFloat(mealPlanAmount || '0') * 100);
  const mealPlanGstPercentage = parseFloat(mealPlanGstPercent || '0');
  const mealPlanGstCents = Math.round(mealPlanAmountCents * (mealPlanGstPercentage / 100));

  const total = bookingTotal({
    tariff: tariffCents,
    gst: gstCents,
    addonAmount: addonCents,
    discount: discountCents,
    mealPlanAmount: mealPlanAmountCents,
    mealPlanGst: mealPlanGstCents,
  });
  const amountPaidCents = Math.max(0, Math.round(parseFloat(amountPaid || '0') * 100));
  const balance = total - amountPaidCents;

  const handleAmountPaidChange = (value: string) => {
    // Never allow a negative advance amount.
    if (value !== '' && parseFloat(value) < 0) return;
    setAmountPaid(value);
    if (!value || parseFloat(value) === 0) setPaymentModeId('');
  };

  const handleDiscountChange = (value: string) => {
    // Never allow a negative or over-100% discount.
    if (value !== '' && (parseFloat(value) < 0 || parseFloat(value) > 100)) return;
    setDiscount(value);
  };

  const reset = () => {
    setGuestName(''); setOccupancy('Single'); setMealPlan('EP'); setCheckIn(todayISO()); setCheckOut(todayISO());
    setRoomIds([]); setRoomAddons({}); setTariff(''); setDiscount(''); setGst(''); setAddonAmount('');
    setMealPlanAmount(''); setMealPlanGstPercent(''); setRemarks('');
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
        mealPlan,
        roomIds,
        roomAddons,
        checkIn,
        checkOut,
        nights,
        tariff: tariffCents,
        gst: gstCents,
        addonAmount: addonCents,
        mealPlanAmount: mealPlanAmountCents,
        mealPlanGst: mealPlanGstCents,
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
            <div>
              <Label>Meal Plan</Label>
              <Select value={mealPlan} onValueChange={(v) => setMealPlan(v as MealPlan)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EP">Room Only (EP)</SelectItem>
                  <SelectItem value="CP">Room + Breakfast (CP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Rooms</Label>
              <span className="text-xs text-muted-foreground">{availableRooms.length} available · {roomIds.length} selected</span>
            </div>

            {availableRooms.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-8 border rounded-xl border-dashed">
                No rooms available for these dates
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 max-h-[220px] overflow-y-auto p-1 pr-2">
                {availableRooms.map(r => {
                  const isSelected = roomIds.includes(r.id);
                  const rt = roomTypes.find(t => t.id === r.roomTypeId);
                  const rate = rateFor(rt, occupancy, mealPlan, r.baseTariff);

                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRoom(r.id)}
                      className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl border p-2.5 text-center transition-all duration-150 ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <span className="font-bold text-gray-900 text-base leading-tight">{r.roomNumber}</span>
                      <span className="text-[11px] text-gray-500 leading-tight truncate w-full">{rt?.name}</span>
                      <span className="text-[11px] font-medium text-gray-600 leading-tight">{formatINR(rate)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {roomIds.length > 0 && addons.length > 0 && (
            <div className="space-y-2 border rounded-xl p-3 bg-muted/20">
              <Label className="block">Addons per Room</Label>
              {roomIds.map(roomId => {
                const r = rooms.find(room => room.id === roomId);
                const roomSelectedAddons = roomAddons[roomId] || [];
                if (!r) return null;
                return (
                  <div key={roomId} className="flex flex-col gap-1.5 rounded-lg bg-white border p-2.5">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Room {r.roomNumber}</span>
                    <div className="flex flex-wrap gap-2">
                      {addons.map(addon => {
                        const isAddonSelected = roomSelectedAddons.some(a => a.id === addon.id);
                        return (
                          <button
                            key={addon.id}
                            type="button"
                            onClick={() => toggleAddon(roomId, addon)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${isAddonSelected ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                          >
                            {isAddonSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 text-gray-400" />}
                            {addon.name} <span className="opacity-70">({formatINR(addon.price)})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Tariff (₹)</Label>
              <Input type="number" min="0" value={tariff} onChange={(e) => setTariff(e.target.value)} />
            </div>
            <div>
              <Label>Discount (%)</Label>
              <Input type="number" min="0" max="100" value={discount} onChange={(e) => handleDiscountChange(e.target.value)} />
            </div>
            <div>
              <Label>GST (%)</Label>
              <Input type="number" min="0" value={gst} onChange={(e) => setGst(e.target.value)} />
            </div>
            <div>
              <Label>Addon (₹)</Label>
              <Input type="number" min="0" value={addonAmount} onChange={(e) => setAddonAmount(e.target.value)} />
            </div>
          </div>
          <div className="border rounded-xl p-3 bg-muted/20">
            <Label className="block mb-2">Meal Plan Allocation (optional)</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Auto-filled from the CP−EP rate difference when Meal Plan above is set to "Room + Breakfast" — adjust
              freely. Feeds into Restaurant Sales as meal plan allocation, and is part of this guest's single bill below.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Meal Plan Amount (₹)</Label>
                <Input type="number" min="0" value={mealPlanAmount} onChange={(e) => setMealPlanAmount(e.target.value)} />
              </div>
              <div>
                <Label>Meal Plan GST (%)</Label>
                <Input type="number" min="0" value={mealPlanGstPercent} onChange={(e) => setMealPlanGstPercent(e.target.value)} />
              </div>
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
                <Input type="number" min="0" value={amountPaid} onChange={(e) => handleAmountPaidChange(e.target.value)} />
              </div>
              <div>
                <Label>Payment Mode{amountPaidCents === 0 && <span className="text-muted-foreground font-normal"> (no amount paid)</span>}</Label>
                <Select value={paymentModeId} onValueChange={setPaymentModeId} disabled={amountPaidCents === 0}>
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
                <div className="text-sm text-muted-foreground">Discount: {discountPercentage}% ({formatINR(discountCents)})</div>
              )}
              {mealPlanAmountCents > 0 && (
                <div className="text-sm text-muted-foreground">Meal Plan: {formatINR(mealPlanAmountCents + mealPlanGstCents)}</div>
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
