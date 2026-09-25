import React, { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Employee } from '@/domain/employee';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmployeeForm } from '@/components/forms/EmployeeForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useEmployees } from '@/hooks/useEmployees';

export function TeamPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { employees, isLoading, addEmployee } = useEmployees();

  const teamMembers = employees.filter(e => e.hasSystemAccess);

  const columns: ColumnDef<Employee>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}`,
    },
    {
      accessorKey: 'email',
      header: 'Login Email',
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant="outline" className={row.original.role === 'admin' ? 'text-primary border-primary' : ''}>
          {row.original.role}
        </Badge>
      ),
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
  ];

  const handleSubmit = async (data: any) => {
    try {
      await addEmployee(data);
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to create login', error);
      alert(error?.message || 'Failed to create login');
    }
  };

  if (isLoading) return <div className="p-8">Loading team...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team & Logins</h2>
          <p className="text-muted-foreground">
            Admin and Manager accounts that can sign in to this property. Every edit or delete a Manager
            makes is recorded in the Audit Log.
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>Add Manager</Button>
      </div>

      <DataTable columns={columns} data={teamMembers} searchKey="name" />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Login</DialogTitle>
          </DialogHeader>
          <EmployeeForm onSubmit={handleSubmit} initialData={{ role: 'manager' }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
