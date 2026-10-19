import { Booking, bookingPending } from './booking';
import { Payment } from './payment';
import { Room, RoomType, foodShareFor } from './room';
import { Money } from './money';

// Shared by Restaurant Sales and the Owner Dashboard so the two screens can never
// disagree on how much of a CP/MAP booking's food gets credited to the restaurant on
// a given date — both must call these same functions, never recompute it locally.

export interface FoodShareSplit {
  settled: Money; // the booking's room bill is fully paid — counts as real restaurant revenue
  pending: Money; // the booking still owes money — this food share isn't actually collected yet either
}

// What a booking contributes to Restaurant Sales per night of its stay — the room
// type's configured Food Share (falling back to the CP/MAP-minus-EP delta if no
// Food Share is set), summed across every room on the booking, plus that night's
// share of whatever GST was entered on the Meal Plan Allocation.
export function nightlyFoodShare(
  booking: Booking,
  roomsById: Map<string, Room>,
  roomTypesById: Map<string, RoomType>
): Money {
  const mealPlan = booking.mealPlan;
  if (!mealPlan || mealPlan === 'EP' || !booking.nights) return 0;
  const foodCost = (booking.roomIds || []).reduce((sum, roomId) => {
    const room = roomsById.get(roomId);
    const roomType = room ? roomTypesById.get(room.roomTypeId) : undefined;
    return sum + foodShareFor(roomType, booking.occupancy, mealPlan);
  }, 0);
  const gstShare = (booking.mealPlanGst || 0) / booking.nights;
  return foodCost + gstShare;
}

// A booking's food share only counts as real restaurant revenue once the guest has
// actually paid for the stay — a bulk-imported (or any) booking still marked Pending
// hasn't paid for its meals either, so that food share belongs in Pending too, not
// silently counted alongside Online/Cash as if it were already collected.
function isBookingPending(booking: Booking, paymentsByBooking: Map<string, Payment[]>): boolean {
  return bookingPending(booking, paymentsByBooking.get(booking.id) || []) > 0;
}

function addSplit(target: FoodShareSplit, amount: Money, pending: boolean) {
  if (pending) target.pending += amount;
  else target.settled += amount;
}

// Sums every booking's nightly share for one specific date (a booking counts for a
// date if that date falls anywhere in [checkIn, checkOut) — the same in/out
// convention used for occupancy everywhere else in the app).
export function foodShareOnDate(
  bookings: Booking[],
  date: string,
  roomsById: Map<string, Room>,
  roomTypesById: Map<string, RoomType>,
  paymentsByBooking: Map<string, Payment[]>
): FoodShareSplit {
  const split: FoodShareSplit = { settled: 0, pending: 0 };
  bookings
    .filter(b => b.checkIn <= date && date < b.checkOut)
    .forEach(b => {
      const nightly = nightlyFoodShare(b, roomsById, roomTypesById);
      if (nightly > 0) addSplit(split, nightly, isBookingPending(b, paymentsByBooking));
    });
  return split;
}

// Sums every booking's nightly share across every night that falls within
// [startDate, endDate] inclusive — for a date-range aggregate (Owner Dashboard)
// rather than a single day or a per-day breakdown.
export function foodShareInRange(
  bookings: Booking[],
  startDate: string,
  endDate: string,
  roomsById: Map<string, Room>,
  roomTypesById: Map<string, RoomType>,
  paymentsByBooking: Map<string, Payment[]>
): FoodShareSplit {
  const split: FoodShareSplit = { settled: 0, pending: 0 };
  bookings.forEach(b => {
    const nightly = nightlyFoodShare(b, roomsById, roomTypesById);
    if (nightly <= 0) return;
    const pending = isBookingPending(b, paymentsByBooking);
    const cursor = new Date(b.checkIn);
    const end = new Date(b.checkOut);
    while (cursor < end) {
      const dateStr = cursor.toISOString().slice(0, 10);
      if (dateStr >= startDate && dateStr <= endDate) addSplit(split, nightly, pending);
      cursor.setDate(cursor.getDate() + 1);
    }
  });
  return split;
}

// Same spreading logic, but bucketed per date — for a day-by-day table (the
// Restaurant Sales monthly view) instead of one summed total.
export function foodShareByDate(
  bookings: Booking[],
  roomsById: Map<string, Room>,
  roomTypesById: Map<string, RoomType>,
  paymentsByBooking: Map<string, Payment[]>,
  dateFilter?: (date: string) => boolean
): Map<string, FoodShareSplit> {
  const byDate = new Map<string, FoodShareSplit>();
  bookings.forEach(b => {
    const nightly = nightlyFoodShare(b, roomsById, roomTypesById);
    if (nightly <= 0) return;
    const pending = isBookingPending(b, paymentsByBooking);
    const cursor = new Date(b.checkIn);
    const end = new Date(b.checkOut);
    while (cursor < end) {
      const dateStr = cursor.toISOString().slice(0, 10);
      if (!dateFilter || dateFilter(dateStr)) {
        const existing = byDate.get(dateStr) || { settled: 0, pending: 0 };
        addSplit(existing, nightly, pending);
        byDate.set(dateStr, existing);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  });
  return byDate;
}

// Hotel stays are essentially never longer than this — bounds how far back a
// booking's check-in can be and still possibly touch the date/range being viewed,
// without needing to fetch the entire booking history.
export const STAY_LOOKBACK_DAYS = 120;

export function lookbackStart(date: string): string {
  const d = new Date(date);
  d.setDate(d.getDate() - STAY_LOOKBACK_DAYS);
  return d.toISOString().slice(0, 10);
}
