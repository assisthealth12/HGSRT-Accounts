import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useStaff } from '@/hooks/useStaff';
import { useAttendance, useMarkAttendance } from '@/hooks/useAttendance';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ClipboardList, Check, X, Users, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAttendanceStatus } from '@/domain/attendance';
import { formatINR } from '@/domain/money';
import { daysPresent, daysPaidLeave, daysAbsent, totalPaid, balanceOwed } from '@/domain/payrollPayment';
import { usePayrollPayments } from '@/hooks/usePayrollPayments';
import { RecordPaymentDialog } from './components/RecordPaymentDialog';
import { EditAttendanceDialog } from './components/EditAttendanceDialog';
import { PayrollDetailsTab } from './PayrollDetailsTab';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/hooks/use-toast';
import { confirmAction } from '@/hooks/use-confirm';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

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

function DailyEntryTab({ activeStaff }: { activeStaff: any[] }) {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayISO());
  const month = date.substring(0, 7);
  
  const { data: records = [], isLoading } = useAttendance(date);
  const { data: monthAttendance = [], isLoading: isMonthLoading } = useMonthAttendance(month);
  const { mutateAsync: markAttendance, isPending } = useMarkAttendance();

  const recordByStaffId = new Map(records.map(r => [r.staffId, r]));

  // Pagination Logic
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const totalPages = Math.ceil(activeStaff.length / itemsPerPage);
  const paginatedStaff = activeStaff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleMark = async (member: any, status: 'present' | 'paid_leave' | 'absent') => {
    const existing = recordByStaffId.get(member.id);
    const currentStatus = existing ? getAttendanceStatus(existing) : null;
    
    if (currentStatus && currentStatus !== status) {
      const statusLabels = { present: 'Present', paid_leave: 'Paid Leave', absent: 'Absent' };
      const oldLabel = statusLabels[currentStatus as keyof typeof statusLabels] || 'Unknown';
      const newLabel = statusLabels[status];
      
      const ok = await confirmAction({
        title: 'Change Attendance?',
        description: `You are changing the attendance for ${member.name} from ${oldLabel} to ${newLabel}. Proceed?`,
        confirmLabel: 'Change'
      });
      if (!ok) return;
    }

    await markAttendance({ staffId: member.id, date, status, existing });
  };

  const handleMarkAllPresent = async () => {
    const unmarked = activeStaff.filter(member => !recordByStaffId.has(member.id));
    if (unmarked.length === 0) {
      toast({ title: 'All staff already marked!' });
      return;
    }
    
    try {
      await Promise.all(
        unmarked.map(member => 
          markAttendance({ staffId: member.id, date, status: 'present', existing: undefined })
        )
      );
      toast({ title: 'Marked all remaining staff as present' });
    } catch (e) {
      toast({ title: 'Failed to mark all', variant: 'destructive' });
    }
  };

  const presentCount = records.filter(r => getAttendanceStatus(r) === 'present').length;

  if (isLoading || isMonthLoading) return <LoadingState label="Loading attendance..." />;
  
  if (activeStaff.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No active staff yet"
        description="Add staff to the roster before marking attendance."
        action={<Button onClick={() => navigate('/staff')}>Go to Staff Roster</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 justify-between items-center">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 w-full md:w-auto">
          <div>
            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Marking Date</Label>
            <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} className="w-full sm:w-48 h-12 rounded-xl text-lg font-bold bg-gray-50 border-gray-200" />
          </div>
          <Button 
            onClick={handleMarkAllPresent}
            disabled={isPending || presentCount === activeStaff.length}
            className="h-12 w-full sm:w-auto rounded-xl px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition-all"
          >
            <Check className="w-4 h-4 mr-2 stroke-[3]" />
            Mark All Present
          </Button>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="text-right">
            <div className="text-2xl font-black text-gray-900">{presentCount} <span className="text-gray-400 text-lg">/ {activeStaff.length}</span></div>
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">Present Today</div>
          </div>
          <div className="w-32 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${(presentCount / activeStaff.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase font-extrabold text-gray-500">
              <tr>
                <th className="px-6 py-4">Staff Member</th>
                <th className="px-6 py-4 text-center">Leave Status (This Month)</th>
                <th className="px-6 py-4 text-center">Mark Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {paginatedStaff.map(member => {
                const record = recordByStaffId.get(member.id);
                const status = record ? getAttendanceStatus(record) : null;
                const isMarked = !!record;
                
                // Get all month attendance to count paid leaves
                const memberMonthRecords = monthAttendance.filter(r => r.staffId === member.id);
                // We exclude today's record if it's currently marked as paid_leave, so the count doesn't jump
                const paidLeavesTaken = daysPaidLeave(memberMonthRecords.filter(r => r.date !== date));
                const paidLeavesAllowed = 4;
                const canTakePaidLeave = paidLeavesTaken < paidLeavesAllowed || status === 'paid_leave';

                return (
                  <tr key={member.id} className={cn(
                    "hover:bg-gray-50/50 transition-colors",
                    isMarked && status === 'present' ? "bg-emerald-50/30" : "",
                    isMarked && status === 'absent' ? "bg-red-50/30" : "",
                    isMarked && status === 'paid_leave' ? "bg-amber-50/30" : ""
                  )}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{member.name}</div>
                      <div className="text-[10px] uppercase text-gray-500">{member.role}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "inline-flex px-3 py-1 rounded-full text-xs font-bold",
                        paidLeavesTaken >= paidLeavesAllowed ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                      )}>
                        {paidLeavesTaken} / {paidLeavesAllowed} Paid Leaves
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleMark(member, 'present')}
                          className={cn(
                            "rounded-lg font-bold transition-all px-4",
                            status === 'present' ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700" : "text-gray-500 hover:text-emerald-700 hover:bg-emerald-50"
                          )}
                        >
                          Present
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending || !canTakePaidLeave}
                          onClick={() => handleMark(member, 'paid_leave')}
                          className={cn(
                            "rounded-lg font-bold transition-all px-4",
                            status === 'paid_leave' ? "bg-amber-500 text-white border-amber-500 hover:bg-amber-600" : "text-gray-500 hover:text-amber-700 hover:bg-amber-50",
                            (!canTakePaidLeave && status !== 'paid_leave') && "opacity-50 cursor-not-allowed"
                          )}
                          title={!canTakePaidLeave ? "Monthly paid leave limit reached" : ""}
                        >
                          Paid Leave
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleMark(member, 'absent')}
                          className={cn(
                            "rounded-lg font-bold transition-all px-4",
                            status === 'absent' ? "bg-red-600 text-white border-red-600 hover:bg-red-700" : "text-gray-500 hover:text-red-700 hover:bg-red-50"
                          )}
                        >
                          Absent (Unpaid)
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50">
            <div className="text-sm text-gray-500">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, activeStaff.length)}</span> of <span className="font-medium">{activeStaff.length}</span> staff
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <div className="text-sm font-medium text-gray-700 px-2">
                Page {currentPage} of {totalPages}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MonthlyViewTab({ activeStaff }: { activeStaff: any[] }) {
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const { data: monthAttendance = [], isLoading } = useMonthAttendance(month);
  const { data: payments = [], isLoading: isLoadingPayments } = usePayrollPayments();
  const [payingStaff, setPayingStaff] = useState<any | null>(null);
  
  const [editCell, setEditCell] = useState<{
    staffId: string;
    staffName: string;
    date: string;
    existing?: any;
    canTakePaidLeave?: boolean;
  } | null>(null);
  const { mutateAsync: markAttendance, isPending: isMarking } = useMarkAttendance();

  const daysInMonth = useMemo(() => {
    const [year, m] = month.split('-').map(Number);
    return new Date(year, m, 0).getDate();
  }, [month]);

  // Pagination Logic
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const totalPages = Math.ceil(activeStaff.length / itemsPerPage);
  const paginatedStaff = activeStaff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (isLoading || isLoadingPayments) return <LoadingState label="Loading monthly data..." />;

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 w-full max-w-xs">
        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Select Month</Label>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-12 rounded-xl text-lg font-bold bg-gray-50 border-gray-200" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase font-extrabold text-gray-500">
              <tr>
                <th className="px-4 py-4 sticky left-0 bg-gray-50 z-10 shadow-[1px_0_0_0_#f3f4f6]">Staff Member</th>
                <th className="px-4 py-4 text-center border-l border-gray-100 bg-emerald-50 text-emerald-700">Totals</th>
                {Array.from({ length: daysInMonth }).map((_, i) => (
                  <th key={i} className="px-2 py-4 text-center border-l border-gray-100 min-w-[40px]">{i + 1}</th>
                ))}
                <th className="px-4 py-4 text-center border-l border-gray-100 bg-gray-50 text-gray-700 sticky right-[120px] shadow-[-1px_0_0_0_#f3f4f6]">Balance</th>
                <th className="px-4 py-4 text-center border-l border-gray-100 bg-gray-50 text-gray-700 sticky right-0 shadow-[-1px_0_0_0_#f3f4f6]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {paginatedStaff.map(member => {
                const memberRecords = monthAttendance.filter(r => r.staffId === member.id);
                const totalPresent = daysPresent(memberRecords);
                const totalPaidLeave = daysPaidLeave(memberRecords);
                const totalAbsent = daysAbsent(memberRecords);
                
                const monthPayments = payments.filter(p => p.staffId === member.id && p.paidOn.startsWith(month));
                const owed = balanceOwed(member.monthlySalary, month, monthPayments, memberRecords);
                
                return (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#f3f4f6]">
                      <div className="font-bold text-gray-900 truncate max-w-[150px]">{member.name}</div>
                      <div className="text-[10px] uppercase text-gray-500">{member.role}</div>
                    </td>
                    <td className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="font-black text-emerald-600 bg-emerald-50/50 px-2 py-1 rounded-md mb-1" title="Present">P: {totalPresent}</div>
                      <div className="font-bold text-amber-600 bg-amber-50/50 px-2 py-1 rounded-md mb-1 text-[11px]" title="Paid Leave">PL: {totalPaidLeave}</div>
                      <div className="font-bold text-red-600 bg-red-50/50 px-2 py-1 rounded-md text-[11px]" title="Absent">A: {totalAbsent}</div>
                    </td>
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dayStr = String(i + 1).padStart(2, '0');
                      const dateStr = `${month}-${dayStr}`;
                      const record = memberRecords.find(r => r.date === dateStr);
                      const status = record ? getAttendanceStatus(record) : null;
                      
                      const paidLeavesTaken = daysPaidLeave(memberRecords.filter(r => r.date !== dateStr));
                      const canTakePaidLeave = paidLeavesTaken < 4 || status === 'paid_leave';

                      return (
                        <td 
                          key={i} 
                          className="px-2 py-3 text-center border-l border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => setEditCell({ staffId: member.id, staffName: member.name, date: dateStr, existing: record, canTakePaidLeave })}
                          title="Click to edit attendance"
                        >
                          {status === 'present' ? (
                            <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">P</span>
                          ) : status === 'paid_leave' ? (
                            <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-xs">PL</span>
                          ) : status === 'absent' ? (
                            <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-red-100 text-red-700 font-bold text-xs">A</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center border-l border-gray-100 sticky right-[120px] bg-white shadow-[-1px_0_0_0_#f3f4f6]">
                      <div className={`font-black whitespace-nowrap ${owed > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {formatINR(owed)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center border-l border-gray-100 sticky right-0 bg-white shadow-[-1px_0_0_0_#f3f4f6]">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setPayingStaff(member)}
                        className="font-bold border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                      >
                        Pay
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50">
            <div className="text-sm text-gray-500">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, activeStaff.length)}</span> of <span className="font-medium">{activeStaff.length}</span> staff
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <div className="text-sm font-medium text-gray-700 px-2">
                Page {currentPage} of {totalPages}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <RecordPaymentDialog staffMember={payingStaff} onOpenChange={(open) => !open && setPayingStaff(null)} />
      
      <EditAttendanceDialog editCell={editCell} onClose={() => setEditCell(null)} />
    </div>
  );
}

export function AttendancePage() {
  const { staff, isLoading } = useStaff();
  
  // Filter out users with system access from attendance
  const activeStaff = staff.filter(s => s.isActive && !s.hasSystemAccess);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        icon={ClipboardList}
        title="Staff Attendance & Payroll"
        description="Manage attendance, view monthly reports, and process payroll."
      />

      <Tabs defaultValue="daily">
        <div className="bg-white p-1.5 rounded-2xl inline-flex mb-6 shadow-sm border border-gray-100">
          <TabsList className="bg-transparent h-auto p-0 gap-2">
            <TabsTrigger 
              value="daily" 
              className="rounded-xl px-6 py-2.5 text-sm font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
            >
              Daily Entry
            </TabsTrigger>
            <TabsTrigger 
              value="monthly" 
              className="rounded-xl px-6 py-2.5 text-sm font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
            >
              Monthly View
            </TabsTrigger>
            <TabsTrigger 
              value="detailed" 
              className="rounded-xl px-6 py-2.5 text-sm font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
            >
              Detailed View
            </TabsTrigger>
          </TabsList>
        </div>
        
        {isLoading ? (
          <LoadingState label="Loading staff..." />
        ) : (
          <>
            <TabsContent value="daily" className="mt-0">
              <DailyEntryTab activeStaff={activeStaff} />
            </TabsContent>
            <TabsContent value="monthly" className="mt-0">
              <MonthlyViewTab activeStaff={activeStaff} />
            </TabsContent>
            <TabsContent value="detailed" className="mt-0">
              <PayrollDetailsTab />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

// Trigger HMR

