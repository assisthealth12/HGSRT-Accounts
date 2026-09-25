import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/domain/money';
import { PayrollEntry } from '@/domain/payroll';
import { Play } from 'lucide-react';
import { usePayrollRuns } from '@/hooks/usePayrollRuns';

const entryColumns: ColumnDef<PayrollEntry>[] = [
  {
    accessorKey: 'employeeName',
    header: 'Employee',
  },
  {
    accessorKey: 'baseSalary',
    header: 'Base Salary',
    cell: ({ row }) => formatINR(row.original.baseSalary),
  },
  {
    id: 'additions',
    header: 'Additions (OT/Bonus)',
    cell: ({ row }) => {
      const total = row.original.overtimeAmount + row.original.bonusAmount;
      return total > 0 ? <span className="text-success">+{formatINR(total)}</span> : '-';
    },
  },
  {
    id: 'deductions',
    header: 'Deductions (Adv/Leave)',
    cell: ({ row }) => {
      const total = row.original.advanceDeduction + row.original.taxDeduction + row.original.leaveDeduction;
      return total > 0 ? <span className="text-destructive">-{formatINR(total)}</span> : '-';
    },
  },
  {
    accessorKey: 'netPayable',
    header: 'Net Payable',
    cell: ({ row }) => <span className="font-bold">{formatINR(row.original.netPayable)}</span>,
  },
];

export function PayrollPage() {
  const { data: payrollRuns = [], isLoading } = usePayrollRuns();
  const currentRun = payrollRuns[0];

  const getMonthName = (monthNumber: number) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString('default', { month: 'long' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payroll Manager</h2>
          <p className="text-muted-foreground">
            Generate and approve monthly staff salaries.
          </p>
        </div>
        <Button>
          <Play className="w-4 h-4 mr-2" /> Run New Payroll
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading payroll runs...</div>
      ) : !currentRun ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No payroll runs yet. Click "Run New Payroll" to generate one.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-xl">
                Current Run: {getMonthName(currentRun.month)} {currentRun.year}
              </CardTitle>
              <div className="mt-2">
                <Badge variant="outline" className="text-warning border-warning">
                  {currentRun.status}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Net Payable</div>
              <div className="text-3xl font-bold">{formatINR(currentRun.totalNetPayable)}</div>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable columns={entryColumns} data={currentRun.entries} />

            <div className="mt-6 flex justify-end space-x-4">
              <Button variant="outline">Save Draft</Button>
              <Button>Approve & Lock Run</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
