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
import { useEmployees } from '@/hooks/useEmployees';
import { useAuthStore } from '@/store/authStore';

export function EmployeesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const { employees, isLoading, addEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const role = useAuthStore((state) => state.role);

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
      cell: ({ row }) => (
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={() => { setEditingEmployee(row.original); setIsDialogOpen(true); }}>
            Edit
          </Button>
          {role === 'admin' && (
            <Button variant="outline" size="sm" onClick={() => handleDelete(row.original)}>
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  const handleSubmit = async (data: any) => {
    try {
      if (editingEmployee) {
        await updateEmployee({ id: editingEmployee.id, data, previous: editingEmployee });
      } else {
        await addEmployee(data);
      }
      setIsDialogOpen(false);
      setEditingEmployee(null);
    } catch (error: any) {
      console.error('Failed to save employee', error);
      alert(error?.message || 'Failed to save employee');
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`Delete ${employee.firstName} ${employee.lastName}? This can be reviewed later in the audit log.`)) return;
    try {
      await deleteEmployee(employee);
    } catch (error: any) {
      console.error('Failed to delete employee', error);
      alert(error?.message || 'Failed to delete employee');
    }
  };

  if (isLoading) return <div className="p-8">Loading employees...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Employees</h2>
          <p className="text-muted-foreground">
            Manage your staff, departments, and payroll details here.
          </p>
        </div>
        <Button onClick={() => { setEditingEmployee(null); setIsDialogOpen(true); }}>Add Employee</Button>
      </div>

      <DataTable
        columns={columns}
        data={employees}
        searchKey="name"
      />

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingEmployee(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
          </DialogHeader>
          <EmployeeForm onSubmit={handleSubmit} initialData={editingEmployee ?? undefined} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
