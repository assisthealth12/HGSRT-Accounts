import { Money, percentage, addMoney } from './money';

export interface GSTConfig {
  id: string;
  ratePercent: number;
  sacCode: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  department: string;
}

export interface TaxAmount {
  cgst: Money;
  sgst: Money;
  igst: Money; // For out of state, if applicable
  totalTax: Money;
}

export function calculateIntraStateTax(baseAmount: Money, ratePercent: number): TaxAmount {
  // Simple calculation for CGST + SGST (half and half)
  const totalTax = percentage(baseAmount, ratePercent);
  const cgst = Math.floor(totalTax / 2);
  const sgst = totalTax - cgst; // Ensure they add up exactly to totalTax

  return {
    cgst,
    sgst,
    igst: 0,
    totalTax,
  };
}

export function applyTax(baseAmount: Money, ratePercent: number): Money {
  const tax = percentage(baseAmount, ratePercent);
  return addMoney(baseAmount, tax);
}
