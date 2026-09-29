import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog';
import { formatINR } from '@/domain/money';
import { Staff } from '@/domain/staff';
import { RecordPaymentDialog } from './components/RecordPaymentDialog';
import { daysPresent, daysPaidLeave, daysAbsent, totalPaid, balanceOwed, calculatedSalary } from '@/domain/payrollPayment';
import { useStaff } from '@/hooks/useStaff';
import { usePayrollPayments, useRecordPayrollPayment } from '@/hooks/usePayrollPayments';
import { usePaymentModes } from '@/hooks/usePaymentModes';
import { useAttendance } from '@/hooks/useAttendance';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { toast } from '@/hooks/use-toast';
import { Wallet, Users } from 'lucide-react';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Attendance for a whole month (useAttendance only covers a single date), needed here
// to compute days-present per staff member for the selected month.
function useMonthAttendance(month: string) {
  const propertyId = useAuthStore((state) => state.propertyId);
  return useQuery({
    queryKey: ['attendance', 'month', month, propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      const q = query(
        collection(db, 'attendance'),
        where('propertyId', '==', propertyId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }) as unknown as { staffId: string; date: string; present: boolean })
        .filter(r => r.date.startsWith(month));
    },
    enabled: !!propertyId && !!month,
  });
}


export function PayrollDetailsTab() {
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const { staff, isLoading: isLoadingStaff } = useStaff();
  const { data: payments = [], isLoading: isLoadingPayments } = usePayrollPayments();
  const { data: monthAttendance = [] } = useMonthAttendance(month);
  const [payingStaff, setPayingStaff] = useState<Staff | null>(null);

  const activeStaff = staff.filter(s => s.isActive && !s.hasSystemAccess);

  const rows = useMemo(() => {
    return activeStaff.map(member => {
      const records = monthAttendance.filter(a => a.staffId === member.id);
      const present = daysPresent(records);
      const paidLeave = daysPaidLeave(records);
      const absent = daysAbsent(records);
      const monthPayments = payments.filter(p => p.staffId === member.id && p.paidOn.startsWith(month));
      const paid = totalPaid(monthPayments);
      const finalSalary = calculatedSalary(member.monthlySalary, month, records);
      const deductions = member.monthlySalary - finalSalary;
      const owed = balanceOwed(member.monthlySalary, month, monthPayments, records);
      return { staff: member, present, paidLeave, absent, paid, finalSalary, deductions, owed };
    });
  }, [activeStaff, monthAttendance, payments, month]);

  const isLoading = isLoadingStaff || isLoadingPayments;

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 w-full max-w-xs">
        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Payroll Month</Label>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-12 rounded-xl text-lg font-bold bg-gray-50 border-gray-200" />
      </div>

      {isLoading ? (
        <LoadingState label="Loading payroll..." />
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="No active staff yet" description="Add staff to the roster first." />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase font-extrabold text-gray-500">
                <tr>
                  <th className="px-6 py-4">Staff Member</th>
                  <th className="px-6 py-4 text-center">Attendance</th>
                  <th className="px-6 py-4 text-right">Base Salary</th>
                  <th className="px-6 py-4 text-right">Unpaid Amount</th>
                  <th className="px-6 py-4 text-right">Final Salary</th>
                  <th className="px-6 py-4 text-right">Total Paid</th>
                  <th className="px-6 py-4 text-right">Balance Owed</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {rows.map(r => (
                  <tr key={r.staff.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{r.staff.name}</div>
                      <div className="text-[10px] uppercase text-gray-500">{r.staff.role}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-1.5">
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider" title="Present">P: {r.present}</span>
                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider" title="Paid Leave">PL: {r.paidLeave}</span>
                        <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider" title="Absent">A: {r.absent}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 font-bold">
                      {formatINR(r.staff.monthlySalary)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-red-500">
                      {r.deductions > 0 ? `-${formatINR(r.deductions)}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-gray-900">
                      {formatINR(r.finalSalary)}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-emerald-600">
                      {formatINR(r.paid)}
                    </td>
                    <td className="px-6 py-4 text-right font-black">
                      <span className={r.owed > 0 ? 'text-red-600' : 'text-emerald-600'}>
                        {formatINR(r.owed)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setPayingStaff(r.staff)}
                        className="font-bold border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                      >
                        Record Payment
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <RecordPaymentDialog staffMember={payingStaff} onOpenChange={(open) => !open && setPayingStaff(null)} />
    </div>
  );
}
