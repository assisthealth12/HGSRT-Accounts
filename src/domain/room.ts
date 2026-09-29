import { BaseDocument } from './base';
import { Money } from './money';

export interface RoomType extends BaseDocument {
  name: string; // e.g., 'Standard', 'Executive', 'Club Suite'
  sortOrder: number;
  active: boolean;
}

export interface Room extends BaseDocument {
  roomNumber: string; // e.g., '101', '102'
  roomTypeId: string;
  floor?: string;
  baseTariff: Money;
  isActive: boolean;
}
