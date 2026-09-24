import React, { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Customer } from '@/domain/customer';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/button';
import { CustomerForm } from '@/components/forms/CustomerForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCustomers } from '@/hooks/useCustomers';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { useQueryClient } from '@tanstack/react-query';

const columns: ColumnDef<Customer>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => <span className="capitalize">{row.original.type}</span>,
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'gstin',
    header: 'GSTIN',
    cell: ({ row }) => row.original.gstin || '-',
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
      const customer = row.original;
      return (
        <Button variant="outline" size="sm" onClick={() => console.log('Edit', customer.id)}>
          Edit
        </Button>
      );
    },
  },
];

export function CustomersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: customers = [], isLoading } = useCustomers();
  const { propertyId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (data: any) => {
    if (!propertyId || !user) return;
    setIsSaving(true);
    
    try {
      const newDoc = {
        ...data,
        propertyId,
        createdAt: Date.now(),
        createdBy: user.uid,
        updatedAt: Date.now(),
        updatedBy: user.uid,
      };
      
      await addDoc(collection(db, 'customers'), newDoc);
      await queryClient.invalidateQueries({ queryKey: ['customers', propertyId] });
      setIsDialogOpen(false);
    } catch (err) {
      console.error("Failed to add customer", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground">
            Manage your individual and corporate clients here.
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>New Customer</Button>
      </div>

      {isLoading ? (
         <div className="py-12 text-center text-muted-foreground">Loading customers...</div>
      ) : (
        <DataTable 
          columns={columns} 
          data={customers} 
          searchKey="name" 
        />
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm onSubmit={handleSubmit} isLoading={isSaving} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
