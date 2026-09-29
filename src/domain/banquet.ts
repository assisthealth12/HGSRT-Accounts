import { BaseDocument } from './base';
import { Money } from './money';

export interface BanquetSale extends BaseDocument {
  saleDate: string; // YYYY-MM-DD, unique per property
  onlineAmount: Money;
  cashAmount: Money;
}
