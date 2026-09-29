import { BaseDocument } from './base';
import { Money } from './money';

export interface RestaurantDailySale extends BaseDocument {
  saleDate: string; // YYYY-MM-DD, unique per property
  onlineAmount: Money;
  cashAmount: Money;
  pendingAmount: Money;
  pendingNotes?: string;
}

// These three numbers must never be stored or hand-typed — always derive them from the
// raw online/cash/pending inputs. The old Excel sheet's exact bug was computing
// "collected" as booked + pending on a few rows; guard against ever repeating that here.
export function totalBooked(onlineAmount: Money, cashAmount: Money, pendingAmount: Money): Money {
  return onlineAmount + cashAmount + pendingAmount;
}

export function totalCollected(onlineAmount: Money, cashAmount: Money): Money {
  return onlineAmount + cashAmount;
}

export function dailyTotal(onlineAmount: Money, cashAmount: Money, mealPlanAllocation: Money): Money {
  return onlineAmount + cashAmount + mealPlanAllocation;
}
