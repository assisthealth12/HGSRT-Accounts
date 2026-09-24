import { BaseDocument } from './base';
import { Money } from './money';

export interface PaymentAllocation extends BaseDocument {
  paymentId: string;
  invoiceId: string;
  customerId: string;
  
  amountAllocated: Money;
  allocationDate: string; // YYYY-MM-DD
  
  isReversed: boolean;
  reverseReason?: string;
  reversedBy?: string;
  reversedAt?: number;
}
