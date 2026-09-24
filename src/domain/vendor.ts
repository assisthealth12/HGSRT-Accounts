import { BaseDocument } from './base';
import { Money } from './money';

export interface Vendor extends BaseDocument {
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  
  gstin?: string;
  panNumber?: string; // Indian Tax ID
  
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
  
  // Ledger
  totalBilled: Money;
  totalPaid: Money;
  balanceOutstanding: Money; // totalBilled - totalPaid
  
  active: boolean;
}
