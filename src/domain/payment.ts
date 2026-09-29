import { BaseDocument } from './base';
import { Money } from './money';

export interface Payment extends BaseDocument {
  bookingId: string;
  amount: Money;
  paymentModeId: string;
  paidOn: string; // YYYY-MM-DD
  referenceNo?: string; // UTR / invoice no. / bank narration
  notes?: string;
}
