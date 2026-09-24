import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/domain/money';
import { PayrollRun, PayrollEntry } from '@/domain/payroll';
import { Play } from 'lucide-react';

const mockPayrollEntries: PayrollEntry[] = [
  {
    employeeId: 'emp1',
    employeeName: 'Ramesh Kumar',
    baseSalary: 3500000,
    overtimeAmount: 150000,
    bonusAmount: 0,
    advanceDeduction: 500000,
    taxDeduction: 0,
    leaveDeduction: 0,
    netPayable: 3150000, // 35000 + 1500 - 5000
  },
  {
    employeeId: 'emp2',
    employeeName: 'Suresh Singh',
    baseSalary: 1800000,
    overtimeAmount: 0,
    bonusAmount: 0,
    advanceDeduction: 0,
    taxDeduction: 0,
    leaveDeduction: 60000, // 1 day LOP roughly
    netPayable: 1740000,
  }
];

const mockPayrollRun: PayrollRun = {
  id: 'pr-sep-2026',
  propertyId: 'hotel-001',
  month: 9,
  year: 2026,
  entries: mockPayrollEntries,
  totalBaseSalary: 5300000,
  totalNetPayable: 4890000,
  status: 'Draft',
  createdAt: Date.now(),
  createdBy: 'admin',
  updatedAt: Date.now(),
  updatedBy: 'admin',
};

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

      <Card className="border-primary/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-xl">
              Current Run: {getMonthName(mockPayrollRun.month)} {mockPayrollRun.year}
            </CardTitle>
            <div className="mt-2">
              <Badge variant="outline" className="text-warning border-warning">
                {mockPayrollRun.status}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total Net Payable</div>
            <div className="text-3xl font-bold">{formatINR(mockPayrollRun.totalNetPayable)}</div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={entryColumns} data={mockPayrollRun.entries} />
          
          <div className="mt-6 flex justify-end space-x-4">
            <Button variant="outline">Save Draft</Button>
            <Button>Approve & Lock Run</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
