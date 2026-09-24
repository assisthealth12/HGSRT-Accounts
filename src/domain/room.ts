import { BaseDocument } from './base';
import { Money } from './money';

export interface RoomType extends BaseDocument {
  name: string; // e.g., 'Executive', 'Standard'
  baseRate: Money;
  extraBedRate: Money;
  baseOccupancy: number;
  maxOccupancy: number;
  active: boolean;
}

export type RoomStatus = 'Available' | 'Reserved' | 'Occupied' | 'Dirty' | 'Maintenance' | 'Blocked';

export interface Room extends BaseDocument {
  roomNumber: string; // e.g., '101', '102'
  roomTypeId: string;
  floor?: string;
  status: RoomStatus;
  notes?: string;
  active: boolean;
}
