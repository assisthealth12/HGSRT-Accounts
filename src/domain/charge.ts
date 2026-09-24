import { BaseDocument } from './base';
import { Money } from './money';
import { TaxAmount } from './gst';

export type ChargeType = 'Room' | 'MealPlan' | 'ExtraBed' | 'Restaurant' | 'Laundry' | 'Other';

export interface Charge extends BaseDocument {
  stayId: string;
  roomId?: string; // Which room incurred the charge
  invoiceId?: string; // If it has been assigned to an invoice yet
  
  businessDate: string; // YYYY-MM-DD - important for Night Audit
  type: ChargeType;
  description: string; // e.g. "Room Charge - 24 Sep"
  
  baseAmount: Money;
  discount: Money;
  taxableAmount: Money; // baseAmount - discount
  
  gstConfigId?: string; // Link to the GST config used
  taxRatePercent: number;
  taxAmount: TaxAmount;
  
  totalAmount: Money; // taxableAmount + taxAmount.totalTax
  
  isVoided: boolean;
  voidReason?: string;
  voidedBy?: string;
  voidedAt?: number;
}
