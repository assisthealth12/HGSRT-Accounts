import React, { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Staff } from '@/domain/staff';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatINR } from '@/domain/money';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useStaff } from '@/hooks/useStaff';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { confirmAction } from '@/hooks/use-confirm';
import { toast } from '@/hooks/use-toast';
import { Users } from 'lucide-react';

function StaffFormDialog({
  open,
  onOpenChange,
  editingStaff,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingStaff: Staff | null;
}) {
  const { addStaff, updateStaff } = useStaff();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadedRef = React.useRef<string>('new');
  const key = editingStaff?.id ?? 'new';
  if (loadedRef.current !== key) {
    loadedRef.current = key;
    setName(editingStaff?.name ?? '');
    setRole(editingStaff?.role ?? '');
    setMonthlySalary(editingStaff ? String(editingStaff.monthlySalary / 100) : '');
  }

  const handleSave = async () => {
    if (!name.trim() || !role.trim() || !monthlySalary) return;
    setIsSaving(true);
    try {
      if (editingStaff) {
        await updateStaff({
          id: editingStaff.id,
          data: { name: name.trim(), role: role.trim(), monthlySalary: Math.round(parseFloat(monthlySalary) * 100) },
          previous: editingStaff,
        });
      } else {
        await addStaff({
          name: name.trim(),
          role: role.trim(),
          monthlySalary: Math.round(parseFloat(monthlySalary) * 100),
          isActive: true,
        } as any);
      }
      toast({ title: editingStaff ? 'Staff updated' : 'Staff added', description: name.trim() });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 border-0 rounded-2xl shadow-2xl">
        <div className="bg-emerald-600 p-6 text-white rounded-t-2xl">
          <DialogTitle className="text-2xl font-extrabold flex items-center gap-2">
            <Users className="w-6 h-6" />
            {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
          </DialogTitle>
          <p className="text-emerald-100 mt-1 text-sm">Manage staff details and monthly salary</p>
        </div>
        
        <div className="p-6 space-y-6 bg-gray-50/50">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-5">
            <div>
              <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 block">Full Name</Label>
              <Input className="h-12 rounded-xl bg-gray-50 border-gray-200" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh Kumar" />
            </div>
            <div>
              <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 block">Role</Label>
              <Input className="h-12 rounded-xl bg-gray-50 border-gray-200" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Housekeeping, Front Desk" />
            </div>
            <div>
              <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 block">Monthly Salary (₹)</Label>
              <Input className="h-12 rounded-xl bg-gray-50 border-gray-200 text-lg font-bold" type="number" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} placeholder="0.00" />
            </div>
            <p className="text-xs font-semibold text-gray-400">
              * To grant this person a system login, use Team &amp; Logins in Admin Settings.
            </p>
          </div>
          
          <Button 
            className="w-full h-14 rounded-xl text-lg font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20" 
            onClick={handleSave} 
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Staff Details'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function StaffPage() {
  const { staff, isLoading, deleteStaff } = useStaff();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const role = useAuthStore((state) => state.role);

  const handleDelete = async (member: Staff) => {
    const confirmed = await confirmAction({
      title: `Remove ${member.name} from staff?`,
      description: 'This can be reviewed later in the audit log.',
      confirmLabel: 'Remove',
      variant: 'destructive',
    });
    if (!confirmed) return;
    await deleteStaff(member);
    toast({ title: 'Staff removed', description: member.name });
  };

  const columns: ColumnDef<Staff, any>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'role', header: 'Role' },
    { accessorKey: 'monthlySalary', header: 'Monthly Salary', cell: ({ row }) => formatINR(row.original.monthlySalary) },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <span className={row.original.isActive ? 'text-success' : 'text-muted-foreground'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={() => { setEditingStaff(row.original); setIsDialogOpen(true); }}>Edit</Button>
          {role === 'admin' && (
            <Button variant="outline" size="sm" onClick={() => handleDelete(row.original)}>Delete</Button>
          )}
        </div>
      ),
    },
  ];

  const visibleStaff = staff.filter(s => !s.hasSystemAccess);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Staff"
        description="Manage your staff roster and salaries."
        actions={<Button onClick={() => { setEditingStaff(null); setIsDialogOpen(true); }}>Add Staff</Button>}
      />

      {isLoading ? (
        <LoadingState label="Loading staff..." />
      ) : visibleStaff.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No staff added yet"
          description="Add your team so you can track attendance and payroll."
          action={<Button onClick={() => { setEditingStaff(null); setIsDialogOpen(true); }}>Add Staff</Button>}
        />
      ) : (
        <DataTable columns={columns} data={visibleStaff} searchKey="name" />
      )}

      <StaffFormDialog
        open={isDialogOpen}
        onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingStaff(null); }}
        editingStaff={editingStaff}
      />
    </div>
  );
}
