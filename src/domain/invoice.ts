import { BaseDocument } from './base';
import { Money } from './money';
import { TaxAmount } from './gst';

export type InvoiceStatus = 'Draft' | 'Issued' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled';

export interface InvoiceItem {
  chargeId: string; // Link to the original Charge record
  description: string;
  taxableAmount: Money;
  taxAmount: TaxAmount;
  totalAmount: Money;
}

export interface Invoice extends BaseDocument {
  invoiceNumber: string; // e.g. INV-2026-00452
  customerId: string; // Bill to customer
  stayId?: string; // Optional if not related to a stay (e.g. standalone banquet)
  
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  
  items: InvoiceItem[];
  
  // Aggregate Totals
  subtotal: Money; // Total before tax and discount
  discount: Money;
  taxableTotal: Money;
  taxTotal: TaxAmount;
  grandTotal: Money; // Final amount
  
  // Financial Ledger state
  paidAmount: Money; 
  balance: Money; // grandTotal - paidAmount
  
  status: InvoiceStatus;
  
  isVoided: boolean;
  voidReason?: string;
  voidedBy?: string;
  voidedAt?: number;
}
