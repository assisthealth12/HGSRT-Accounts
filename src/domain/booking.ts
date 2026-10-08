import { BaseDocument } from './base';
import { Money } from './money';
import { MealPlan } from './room';

export type Occupancy = 'Single' | 'Double' | 'Triple';

export interface Booking extends BaseDocument {
  guestName: string;
  occupancy: Occupancy;
  mealPlan?: MealPlan; // EP (room only) or CP (room + breakfast) — drives rate lookup
  roomIds: string[];
  roomAddons?: Record<string, { id: string; name: string; price: number }[]>;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;
  tariff: Money;
  gst: Money;
  addonAmount: Money; // per-room addons (Extra Bed, etc.)
  mealPlanAmount?: Money; // CP/MAP meal plan — optional, feeds Restaurant Sales
  mealPlanGst?: Money; // GST on the meal plan portion, entered as a % in the UI
  discount: Money;
  remarks?: string;
  source?: 'bulk-import'; // set on bookings created via Bulk Import, so they can be found/undone as a group
  importBatchId?: string; // groups all bookings created by the same Bulk Import run
}

// Computed — never stored, never typed over. Meal plan is part of the single
// guest bill (not a separate transaction), so it's folded into the same total.
export function bookingTotal(booking: Pick<Booking, 'tariff' | 'gst' | 'addonAmount' | 'discount' | 'mealPlanAmount' | 'mealPlanGst'>): Money {
  return booking.tariff + booking.gst + booking.addonAmount
    + (booking.mealPlanAmount || 0) + (booking.mealPlanGst || 0)
    - (booking.discount || 0);
}

export function bookingReceived(paymentsForBooking: { amount: Money }[]): Money {
  return paymentsForBooking.reduce((acc, p) => acc + p.amount, 0);
}

export function bookingPending(booking: Pick<Booking, 'tariff' | 'gst' | 'addonAmount' | 'discount' | 'mealPlanAmount' | 'mealPlanGst'>, paymentsForBooking: { amount: Money }[]): Money {
  return bookingTotal(booking) - bookingReceived(paymentsForBooking);
}

// Two date ranges [aStart, aEnd) and [bStart, bEnd) overlap.
export function datesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}
