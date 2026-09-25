import { BaseDocument } from './base';
import { Money } from './money';

export interface BanquetSale extends BaseDocument {
  date: string; // YYYY-MM-DD
  eventName: string;
  onlineAmount: Money;
  cashAmount: Money;
}
