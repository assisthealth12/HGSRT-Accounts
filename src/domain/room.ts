import { BaseDocument } from './base';
import { Money } from './money';

export type MealPlan = 'EP' | 'CP'; // EP = Room Only, CP = Room + Breakfast
export type RoomOccupancy = 'Single' | 'Double' | 'Triple';

export interface OccupancyRates {
  singleEP: Money;
  singleCP: Money;
  doubleEP: Money;
  doubleCP: Money;
  tripleEP: Money;
  tripleCP: Money;
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

// The CP rate includes breakfast the EP rate doesn't — this delta is what
// auto-suggests the Meal Plan Allocation amount when a guest picks CP.
export function mealPlanDeltaFor(
  roomType: Pick<RoomType, 'rates'> | undefined,
  occupancy: RoomOccupancy
): Money {
  if (!roomType?.rates) return 0;
  const cpKey = `${occupancy.toLowerCase()}CP` as keyof OccupancyRates;
  const epKey = `${occupancy.toLowerCase()}EP` as keyof OccupancyRates;
  const cp = roomType.rates[cpKey];
  const ep = roomType.rates[epKey];
  if (typeof cp !== 'number' || typeof ep !== 'number') return 0;
  return Math.max(0, cp - ep);
}
