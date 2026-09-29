import { BaseDocument } from './base';
import { Money } from './money';

export interface PayrollPayment extends BaseDocument {
  staffId: string;
  amount: Money;
  paymentModeId: string; // GRV/GSR/Cash/Bank etc. become real named payment modes
  paidOn: string; // YYYY-MM-DD
  notes?: string;
}

import { getAttendanceStatus } from './attendance';

export function daysPresent(records: { present?: boolean; status?: 'present' | 'paid_leave' | 'absent' }[]): number {
  return records.filter(r => getAttendanceStatus(r) === 'present').length;
}

export function daysPaidLeave(records: { present?: boolean; status?: 'present' | 'paid_leave' | 'absent' }[]): number {
  return records.filter(r => getAttendanceStatus(r) === 'paid_leave').length;
}

export function daysAbsent(records: { present?: boolean; status?: 'present' | 'paid_leave' | 'absent' }[]): number {
  return records.filter(r => getAttendanceStatus(r) === 'absent').length;
}

export function totalPaid(payments: { amount: Money }[]): Money {
  return payments.reduce((acc, p) => acc + p.amount, 0);
}

// Logic: Max 4 paid leaves per month.
// Only marked 'present' and allowed 'paid_leave' days are paid. Unmarked days are unpaid.
export function calculatedSalary(
  monthlySalary: Money,
  month: string, // YYYY-MM
  attendanceRecords: { present?: boolean; status?: 'present' | 'paid_leave' | 'absent' }[] = []
): Money {
  const pDays = daysPresent(attendanceRecords);
  const plDays = daysPaidLeave(attendanceRecords);
  
  // Calculate actual days in the given month
  const [year, m] = month.split('-').map(Number);
  const daysInMonth = new Date(year, m, 0).getDate();
  
  const perDaySalary = monthlySalary / daysInMonth;
  const payDays = pDays + Math.min(plDays, 4);
  const finalSalary = Math.round(perDaySalary * payDays);
  
  return Math.min(monthlySalary, finalSalary);
}

export function balanceOwed(
  monthlySalary: Money, 
  month: string,
  payments: { amount: Money }[],
  attendanceRecords: { present?: boolean; status?: 'present' | 'paid_leave' | 'absent' }[] = []
): Money {
  const finalSalary = calculatedSalary(monthlySalary, month, attendanceRecords);
  return finalSalary - totalPaid(payments);
}
