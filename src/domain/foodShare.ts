import { Booking } from './booking';
import { Room, RoomType, foodShareFor } from './room';
import { Money } from './money';

// Shared by Restaurant Sales and the Owner Dashboard so the two screens can never
// disagree on how much of a CP/MAP booking's food gets credited to the restaurant on
// a given date — both must call these same functions, never recompute it locally.
//
// This is intentionally independent of whether the room booking itself has been
// paid — Meal Plan here is just "food served," not tied to the room bill's payment
// status. If you need to track unpaid food separately, that's a different number.

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

// Sums every booking's nightly share for one specific date (a booking counts for a
// date if that date falls anywhere in [checkIn, checkOut) — the same in/out
// convention used for occupancy everywhere else in the app).
export function foodShareOnDate(
  bookings: Booking[],
  date: string,
  roomsById: Map<string, Room>,
  roomTypesById: Map<string, RoomType>
): Money {
  return bookings
    .filter(b => b.checkIn <= date && date < b.checkOut)
    .reduce((acc, b) => acc + nightlyFoodShare(b, roomsById, roomTypesById), 0);
}

// Sums every booking's nightly share across every night that falls within
// [startDate, endDate] inclusive — for a date-range aggregate (Owner Dashboard)
// rather than a single day or a per-day breakdown.
export function foodShareInRange(
  bookings: Booking[],
  startDate: string,
  endDate: string,
  roomsById: Map<string, Room>,
  roomTypesById: Map<string, RoomType>
): Money {
  let total = 0;
  bookings.forEach(b => {
    const nightly = nightlyFoodShare(b, roomsById, roomTypesById);
    if (nightly <= 0) return;
    const cursor = new Date(b.checkIn);
    const end = new Date(b.checkOut);
    while (cursor < end) {
      const dateStr = cursor.toISOString().slice(0, 10);
      if (dateStr >= startDate && dateStr <= endDate) total += nightly;
      cursor.setDate(cursor.getDate() + 1);
    }
  });
  return total;
}

// Same spreading logic, but bucketed per date — for a day-by-day table (the
// Restaurant Sales monthly view) instead of one summed total.
export function foodShareByDate(
  bookings: Booking[],
  roomsById: Map<string, Room>,
  roomTypesById: Map<string, RoomType>,
  dateFilter?: (date: string) => boolean
): Map<string, Money> {
  const byDate = new Map<string, Money>();
  bookings.forEach(b => {
    const nightly = nightlyFoodShare(b, roomsById, roomTypesById);
    if (nightly <= 0) return;
    const cursor = new Date(b.checkIn);
    const end = new Date(b.checkOut);
    while (cursor < end) {
      const dateStr = cursor.toISOString().slice(0, 10);
      if (!dateFilter || dateFilter(dateStr)) {
        byDate.set(dateStr, (byDate.get(dateStr) || 0) + nightly);
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
