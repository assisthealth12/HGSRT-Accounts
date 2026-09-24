import { BaseDocument } from './base';
import { Money } from './money';

export type PayrollStatus = 'Draft' | 'Approved' | 'Paid';

export interface PayrollEntry {
  employeeId: string;
  employeeName: string;
  
  baseSalary: Money;
  
  // Additions
  overtimeAmount: Money;
  bonusAmount: Money;
  
  // Deductions
  advanceDeduction: Money;
  taxDeduction: Money; // PF/TDS in India
  leaveDeduction: Money; // LOP
  
  netPayable: Money; // base + additions - deductions
}

export interface PayrollRun extends BaseDocument {
  month: number; // 1-12
  year: number; // e.g. 2026
  
  entries: PayrollEntry[];
  
  totalBaseSalary: Money;
  totalNetPayable: Money;
  
  status: PayrollStatus;
  
  approvedBy?: string;
  approvedAt?: number;
  
  paidAt?: number;
}
