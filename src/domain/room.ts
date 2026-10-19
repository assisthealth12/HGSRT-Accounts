import { BaseDocument } from './base';
import { Money } from './money';

export type MealPlan = 'EP' | 'CP' | 'MAP'; // EP = Room Only, CP = Room + Breakfast, MAP = Room + Breakfast + one more meal
export type RoomOccupancy = 'Single' | 'Double' | 'Triple';

export interface OccupancyRates {
  singleEP: Money;
  singleCP: Money;
  singleMAP: Money;
  doubleEP: Money;
  doubleCP: Money;
  doubleMAP: Money;
  tripleEP: Money;
  tripleCP: Money;
  tripleMAP: Money;
  // Manually-set nightly food cost, per occupancy — what actually gets credited to
  // Restaurant Sales. Distinct from the CP/MAP rate itself, which is what the guest is
  // billed (room package price) and may include margin beyond raw food cost. Optional:
  // falls back to the CP/MAP-minus-EP delta when not set, same as before this existed.
  singleCPFoodShare?: Money;
  singleMAPFoodShare?: Money;
  doubleCPFoodShare?: Money;
  doubleMAPFoodShare?: Money;
  tripleCPFoodShare?: Money;
  tripleMAPFoodShare?: Money;
}

export interface RoomType extends BaseDocument {
  name: string; // e.g., 'Standard', 'Executive', 'Club Suite'
  sortOrder: number;
  active: boolean;
  rates?: OccupancyRates; // per-occupancy, per-meal-plan tariff — optional for room types created before this existed
}

export interface Room extends BaseDocument {
  roomNumber: string; // e.g., '101', '102'
  roomTypeId: string;
  floor?: string;
  baseTariff: Money; // fallback rate, used only when the room's type has no rates configured
  isActive: boolean;
}

// Looks up the configured rate for a room type + occupancy + meal plan, falling back
// to the room's flat baseTariff if that room type has no rates matrix set up yet.
export function rateFor(
  roomType: Pick<RoomType, 'rates'> | undefined,
  occupancy: RoomOccupancy,
  mealPlan: MealPlan,
  fallback: Money
): Money {
  if (!roomType?.rates) return fallback;
  const key = `${occupancy.toLowerCase()}${mealPlan}` as keyof OccupancyRates;
  const rate = roomType.rates[key];
  return typeof rate === 'number' ? rate : fallback;
}

// CP/MAP rates include meals the EP rate doesn't — this delta is what auto-suggests
// the Meal Plan Allocation amount when a guest picks CP or MAP.
export function mealPlanDeltaFor(
  roomType: Pick<RoomType, 'rates'> | undefined,
  occupancy: RoomOccupancy,
  mealPlan: MealPlan = 'CP'
): Money {
  if (!roomType?.rates || mealPlan === 'EP') return 0;
  const planKey = `${occupancy.toLowerCase()}${mealPlan}` as keyof OccupancyRates;
  const epKey = `${occupancy.toLowerCase()}EP` as keyof OccupancyRates;
  const plan = roomType.rates[planKey];
  const ep = roomType.rates[epKey];
  if (typeof plan !== 'number' || typeof ep !== 'number') return 0;
  return Math.max(0, plan - ep);
}

// What actually goes to the restaurant's books per night, per room — the manually-set
// Food Share if configured, otherwise the same CP/MAP-minus-EP delta used to bill the
// guest (so a room type with no Food Share set behaves exactly as it did before this
// existed).
export function foodShareFor(
  roomType: Pick<RoomType, 'rates'> | undefined,
  occupancy: RoomOccupancy,
  mealPlan: MealPlan = 'CP'
): Money {
  if (!roomType?.rates || mealPlan === 'EP') return 0;
  const shareKey = `${occupancy.toLowerCase()}${mealPlan}FoodShare` as keyof OccupancyRates;
  const share = roomType.rates[shareKey];
  if (typeof share === 'number') return share;
  return mealPlanDeltaFor(roomType, occupancy, mealPlan);
}
