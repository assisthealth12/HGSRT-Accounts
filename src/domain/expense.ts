import { BaseDocument } from './base';
import { Money } from './money';
import { TaxAmount } from './gst';

export type ExpenseCategory = 'Maintenance' | 'Groceries' | 'Utilities' | 'Marketing' | 'Supplies' | 'Other';
export type ExpenseStatus = 'Pending Approval' | 'Approved' | 'Paid' | 'Rejected';

export interface ExpenseItem {
  description: string;
  amount: Money;
  taxAmount?: TaxAmount;
  totalAmount: Money;
}

export interface Expense extends BaseDocument {
  vendorId?: string; // If applicable
  category: ExpenseCategory;
  
  invoiceNumber?: string; // Vendor's invoice number
  invoiceDate: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  
  items: ExpenseItem[];
  
  subtotal: Money;
  taxTotal: TaxAmount;
  grandTotal: Money;
  
  status: ExpenseStatus;
  
  paymentId?: string; // Link to the outbound payment
  
  approvedBy?: string;
  approvedAt?: number;
  
  isVoided: boolean;
}
