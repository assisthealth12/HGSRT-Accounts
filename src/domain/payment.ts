import { BaseDocument } from './base';
import { Money } from './money';

// Historically a fixed union; now sourced from the admin-editable `paymentModes`
// collection (see usePaymentModes), so any non-empty name the admin has added is valid.
export type PaymentMode = string;
export type PaymentStatus = 'Received' | 'Reversed';

export interface Payment extends BaseDocument {
  receiptNumber: string; // e.g. RCPT-2026-00125
  customerId: string; // Who paid
  
  amount: Money;
  paymentDate: string; // YYYY-MM-DD
  paymentMode: PaymentMode;
  
  referenceNumber?: string; // UPI ID, Cheque No, Transaction ID
  bankName?: string;
  notes?: string;
  
  // Amount that has been applied against invoices
  allocatedAmount: Money;
  // Amount available to be used as advance or applied later
  unallocatedAmount: Money; // amount - allocatedAmount
  
  status: PaymentStatus;
  
  isReversed: boolean;
  reverseReason?: string;
  reversedBy?: string;
  reversedAt?: number;
}
