import { BaseDocument } from './base';
import { Money } from './money';

export interface Expense extends BaseDocument {
  categoryId: string;
  vendorName: string;
  description?: string;
  billAmount: Money;
  orderDate: string; // YYYY-MM-DD
  deliveryDate?: string; // YYYY-MM-DD
  paymentModeId: string;
  paidOn: string; // YYYY-MM-DD
  notes?: string;
}
