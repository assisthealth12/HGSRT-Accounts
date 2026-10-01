import { BaseDocument } from './base';
import { Money } from './money';

export type Occupancy = 'Single' | 'Double' | 'Triple';

export interface Booking extends BaseDocument {
  guestName: string;
  occupancy: Occupancy;
  roomIds: string[];
  roomAddons?: Record<string, { id: string; name: string; price: number }[]>;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;
  tariff: Money;
  gst: Money;
  addonAmount: Money; // meal plan / CP-MAP
  discount: Money;
  remarks?: string;
}

// Computed — never stored, never typed over.
export function bookingTotal(booking: Pick<Booking, 'tariff' | 'gst' | 'addonAmount' | 'discount'>): Money {
  return booking.tariff + booking.gst + booking.addonAmount - (booking.discount || 0);
}

export function bookingReceived(paymentsForBooking: { amount: Money }[]): Money {
  return paymentsForBooking.reduce((acc, p) => acc + p.amount, 0);
}

export function bookingPending(booking: Pick<Booking, 'tariff' | 'gst' | 'addonAmount' | 'discount'>, paymentsForBooking: { amount: Money }[]): Money {
  return bookingTotal(booking) - bookingReceived(paymentsForBooking);
}

// Two date ranges [aStart, aEnd) and [bStart, bEnd) overlap.
export function datesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}
