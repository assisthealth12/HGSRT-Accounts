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
import { Booking, bookingTotal, datesOverlap, Occupancy } from '@/domain/booking';
import { rateFor, mealPlanDeltaFor, MealPlan } from '@/domain/room';
import { useRooms } from '@/hooks/useRooms';
import { useRoomTypes } from '@/hooks/useRoomTypes';
import { useBookingsInRange, useUpdateBooking } from '@/hooks/useBookings';
import { useAddons, Addon } from '@/hooks/useAddons';
import { toast } from '@/hooks/use-toast';
import { Check, Plus } from 'lucide-react';

function nightsBetween(checkIn: string, checkOut: string) {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function EditBookingDialog({ booking, onOpenChange }: { booking: Booking | null; onOpenChange: (open: boolean) => void }) {
  const { data: rooms = [] } = useRooms();
  const { data: roomTypes = [] } = useRoomTypes();
  const { mutateAsync: updateBooking, isPending } = useUpdateBooking();

  const [guestName, setGuestName] = useState('');
  const [occupancy, setOccupancy] = useState<Occupancy>('Single');
  const [mealPlan, setMealPlan] = useState<MealPlan>('EP');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [roomIds, setRoomIds] = useState<string[]>([]);
  const [roomAddons, setRoomAddons] = useState<Record<string, { id: string; name: string; price: number }[]>>({});
  const [tariff, setTariff] = useState('');
  const [discount, setDiscount] = useState('');
  const [gst, setGst] = useState('');
  const [addonAmount, setAddonAmount] = useState('');
  const [mealPlanAmount, setMealPlanAmount] = useState('');
  const [mealPlanGstPercent, setMealPlanGstPercent] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  const { data: addons = [] } = useAddons();

  const overlapWindowStart = useMemo(() => {
    const d = new Date(checkIn || new Date().toISOString().slice(0, 10));
    d.setDate(d.getDate() - 120);
    return d.toISOString().slice(0, 10);
  }, [checkIn]);
  const { data: bookings = [] } = useBookingsInRange(overlapWindowStart, checkOut || checkIn || new Date().toISOString().slice(0, 10));

  // Set right after a fresh booking load so the nights-recalc effect below knows to
  // skip its very next run — otherwise it fires on mount/booking-switch with the
  // previous render's stale roomIds/roomAddons and clobbers the values just loaded.
  const justLoadedRef = React.useRef(false);

  useEffect(() => {
    if (booking) {
      setGuestName(booking.guestName);
      setOccupancy(booking.occupancy);
      setMealPlan(booking.mealPlan || 'EP');
      setCheckIn(booking.checkIn);
      setCheckOut(booking.checkOut);
      setRoomIds(booking.roomIds || []);
      setRoomAddons(booking.roomAddons || {});
      setTariff((booking.tariff / 100).toString());
      // Discount is a % of Tariff (same pattern as GST), so reverse it out the same way.
      const discountPct = booking.tariff > 0 ? Math.round((booking.discount / booking.tariff) * 100) : 0;
      setDiscount(discountPct.toString());
      // GST is applied on Tariff + Addons, so reverse it out using the same base.
      const gstBase = booking.tariff + (booking.addonAmount || 0);
      const gstPct = gstBase > 0 ? Math.round((booking.gst / gstBase) * 100) : 0;
      setGst(gstPct.toString());
      setAddonAmount(((booking.addonAmount || 0) / 100).toString());
      setMealPlanAmount(((booking.mealPlanAmount || 0) / 100).toString());
      const mealPlanBase = booking.mealPlanAmount || 0;
      const mealPlanGstPct = mealPlanBase > 0 ? Math.round(((booking.mealPlanGst || 0) / mealPlanBase) * 100) : 0;
      setMealPlanGstPercent(mealPlanGstPct.toString());
      setRemarks(booking.remarks || '');
      setError('');
      justLoadedRef.current = true;
    }
  }, [booking]);

  const availableRooms = useMemo(() => {
    return rooms.filter(room => {
      const conflict = bookings.some(b => b.id !== booking?.id && b.roomIds?.includes(room.id) && datesOverlap(checkIn, checkOut, b.checkIn, b.checkOut));
      return !conflict;
    });
  }, [rooms, bookings, checkIn, checkOut, booking?.id]);

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 1;
  
  // Tariff and addon amount are both derived from the selected rooms, never
  // stored/typed-over — recompute them right at the point roomIds/roomAddons
  // change instead of via an effect, since an effect keyed on them would also
  // fire on initial booking load and wipe out the saved values before the
  // user has touched anything.
  const recalcTariff = (ids: string[]) => {
    const totalTariffCents = ids.reduce((sum, rId) => {
      const r = rooms.find(room => room.id === rId);
      if (!r) return sum;
      const rt = roomTypes.find(t => t.id === r.roomTypeId);
      return sum + rateFor(rt, occupancy, mealPlan, r.baseTariff);
    }, 0);
    setTariff(totalTariffCents > 0 ? ((totalTariffCents * nights) / 100).toString() : '');
  };

  // When CP (Room + Breakfast) is picked, suggest the Meal Plan Allocation as the
  // CP−EP rate difference across selected rooms — still a plain editable field.
  const recalcMealPlanSuggestion = (ids: string[]) => {
    if (mealPlan !== 'CP') {
      setMealPlanAmount('0');
      return;
    }
    const totalDeltaCents = ids.reduce((sum, rId) => {
      const r = rooms.find(room => room.id === rId);
      if (!r) return sum;
      const rt = roomTypes.find(t => t.id === r.roomTypeId);
      return sum + mealPlanDeltaFor(rt, occupancy);
    }, 0);
    setMealPlanAmount(totalDeltaCents > 0 ? ((totalDeltaCents * nights) / 100).toString() : '');
  };

  const recalcAddonAmount = (updated: Record<string, { id: string; name: string; price: number }[]>) => {
    const totalAddonsCents = Object.values(updated).flat().reduce((sum, a) => sum + a.price, 0);
    setAddonAmount(totalAddonsCents > 0 ? ((totalAddonsCents * nights) / 100).toString() : '0');
  };

  const toggleRoom = (id: string) => {
    setRoomIds(prev => {
      const updated = prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id];

      if (prev.includes(id)) {
        setRoomAddons(curr => {
          const copy = { ...curr };
          delete copy[id];
          recalcAddonAmount(copy);
          return copy;
        });
      }

      recalcTariff(updated);
      recalcMealPlanSuggestion(updated);
      return updated;
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

  // Nights, Occupancy, or Meal Plan can change after rooms are already selected —
  // keep the tariff/addon/meal-plan totals in sync with the current selection
  // whenever any of them change.
  useEffect(() => {
    if (justLoadedRef.current) {
      justLoadedRef.current = false;
      return;
    }
    recalcTariff(roomIds);
    recalcAddonAmount(roomAddons);
    recalcMealPlanSuggestion(roomIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nights, occupancy, mealPlan]);

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

  const handleDiscountChange = (value: string) => {
    // Never allow a negative or over-100% discount.
    if (value !== '' && (parseFloat(value) < 0 || parseFloat(value) > 100)) return;
    setDiscount(value);
  };

  const handleSave = async () => {
    if (!booking) return;
    setError('');
    if (!guestName.trim() || roomIds.length === 0 || !tariff) {
      setError('Guest name, at least one room, and tariff are required.');
      return;
    }
    
    try {
      await updateBooking({
        id: booking.id,
        previous: booking,
        data: {
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
        }
      });
      toast({ title: 'Booking updated', description: `${guestName.trim()} — ${formatINR(total)}` });
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to update booking');
    }
  };

  return (
    <Dialog open={!!booking} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
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

          <div className="flex justify-between items-center pt-4 border-t">
            <div>
              <div className="text-sm text-muted-foreground">{nights} night(s) &bull; {roomIds.length} room(s)</div>
              {mealPlanAmountCents > 0 && (
                <div className="text-sm text-muted-foreground">Meal Plan: {formatINR(mealPlanAmountCents + mealPlanGstCents)}</div>
              )}
              {discountCents > 0 && (
                <div className="text-sm text-muted-foreground">Discount: {discountPercentage}% ({formatINR(discountCents)})</div>
              )}
              <div className="text-lg font-bold">Total: {formatINR(total)}</div>
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
          </div>
          <Button className="w-full" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving...' : 'Update Booking'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
