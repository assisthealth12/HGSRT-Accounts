import React, { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Employee } from '@/domain/employee';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/button';
import { EmployeeForm } from '@/components/forms/EmployeeForm';
import { formatINR } from '@/domain/money';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const columns: ColumnDef<Employee>[] = [
  {
    accessorKey: 'employeeCode',
    header: 'Emp Code',
  },
  {
    id: 'name',
    header: 'Name',
    cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}`,
  },
  {
    accessorKey: 'department',
    header: 'Department',
  },
  {
    accessorKey: 'designation',
    header: 'Designation',
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
  },
  {
    accessorKey: 'monthlySalary',
    header: 'Salary',
    cell: ({ row }) => formatINR(row.original.monthlySalary),
  },
  {
    accessorKey: 'active',
    header: 'Status',
    cell: ({ row }) => (
      <span className={row.original.active ? 'text-success' : 'text-muted-foreground'}>
        {row.original.active ? 'Active' : 'Inactive'}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return (
        <Button variant="outline" size="sm" onClick={() => console.log('Edit Employee', row.original.id)}>
          Edit
        </Button>
      );
    },
  },
];

const mockEmployees: Employee[] = [
  {
    id: 'emp1',
    propertyId: 'hotel-001',
    employeeCode: 'EMP-001',
    firstName: 'Ramesh',
    lastName: 'Kumar',
    phone: '9876543210',
    department: 'Front Office',
    designation: 'Manager',
    joiningDate: '2025-01-15',
    monthlySalary: 3500000, // ₹35,000
    active: true,
    createdAt: Date.now(),
    createdBy: 'admin',
    updatedAt: Date.now(),
    updatedBy: 'admin',
  },
  {
    id: 'emp2',
    propertyId: 'hotel-001',
    employeeCode: 'EMP-002',
    firstName: 'Suresh',
    lastName: 'Singh',
    phone: '9123456789',
    department: 'Housekeeping',
    designation: 'Supervisor',
    joiningDate: '2025-03-01',
    monthlySalary: 1800000, // ₹18,000
    active: true,
    createdAt: Date.now(),
    createdBy: 'admin',
    updatedAt: Date.now(),
    updatedBy: 'admin',
  }
];

export function EmployeesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSubmit = (data: any) => {
    console.log('Employee data submitted:', data);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Employees</h2>
          <p className="text-muted-foreground">
            Manage your staff, departments, and payroll details here.
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>Add Employee</Button>
      </div>

      <DataTable 
        columns={columns} 
        data={mockEmployees} 
        searchKey="name" 
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <EmployeeForm onSubmit={handleSubmit} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
