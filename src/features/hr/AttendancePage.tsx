import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEmployees } from '@/hooks/useEmployees';
import { useAttendance, useMarkAttendance } from '@/hooks/useAttendance';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendancePage() {
  const [date, setDate] = useState(todayISO());
  const { employees, isLoading: isLoadingEmployees } = useEmployees();
  const { data: records = [], isLoading: isLoadingAttendance } = useAttendance(date);
  const { mutateAsync: markAttendance, isPending } = useMarkAttendance();

  const activeEmployees = employees.filter(e => e.active);
  const recordByStaffId = new Map(records.map(r => [r.staffId, r]));

  const handleToggle = async (staffId: string, present: boolean) => {
    const existing = recordByStaffId.get(staffId);
    await markAttendance({ staffId, date, present, existing });
  };

  const presentCount = records.filter(r => r.present).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground">Mark daily staff attendance.</p>
        </div>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-48" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            {date} — {presentCount} / {activeEmployees.length} present
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(isLoadingEmployees || isLoadingAttendance) ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : activeEmployees.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No active employees yet.</div>
          ) : (
            <div className="divide-y">
              {activeEmployees.map(emp => {
                const record = recordByStaffId.get(emp.id);
                const present = record?.present ?? false;
                return (
                  <div key={emp.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-medium">{emp.firstName} {emp.lastName}</div>
                      <div className="text-sm text-muted-foreground">{emp.designation}</div>
                    </div>
                    <div className="space-x-2">
                      <Button
                        variant={present ? 'default' : 'outline'}
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleToggle(emp.id, true)}
                      >
                        Present
                      </Button>
                      <Button
                        variant={!present && record ? 'destructive' : 'outline'}
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleToggle(emp.id, false)}
                      >
                        Absent
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
