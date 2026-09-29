import React, { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Staff } from '@/domain/staff';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useStaff } from '@/hooks/useStaff';
import { UserRole } from '@/domain/user';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { toast } from '@/hooks/use-toast';
import { confirmAction } from '@/hooks/use-confirm';
import { UserCog, Pencil, Trash2 } from 'lucide-react';

function AddLoginForm({ onSaved }: { onSaved: () => void }) {
  const { addStaff } = useStaff();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessRole, setAccessRole] = useState<UserRole>('manager');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError('Name, email, and a password of at least 6 characters are required.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await addStaff({
        name: name.trim(),
        role: accessRole === 'admin' ? 'Admin' : 'Manager',
        monthlySalary: 0,
        isActive: true,
        email: email.trim(),
        password,
        accessRole,
      } as any);
      toast({ title: 'Login created', description: `${name.trim()} can now sign in as ${accessRole}.` });
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Failed to create login');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <Label>Login Email</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label>Initial Password</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <Label>Access Role</Label>
        <Select value={accessRole} onValueChange={(v) => setAccessRole(v as UserRole)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {error && <div className="text-sm text-destructive">{error}</div>}
      <Button className="w-full" onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Creating...' : 'Create Login'}
      </Button>
    </div>
  );
}

function EditLoginForm({ member, onSaved }: { member: Staff; onSaved: () => void }) {
  const { updateStaff } = useStaff();
  const [name, setName] = useState(member.name);
  const [isActive, setIsActive] = useState(member.isActive);
  const [accessRole, setAccessRole] = useState<UserRole>(member.accessRole || 'manager');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await updateStaff({
        id: member.id,
        previous: member,
        data: {
          name: name.trim(),
          isActive,
          accessRole,
          role: accessRole === 'admin' ? 'Admin' : 'Manager'
        }
      });
      toast({ title: 'Login updated', description: `${name.trim()} has been updated.` });
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Failed to update login');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <Label className="text-gray-500">Login Email (Cannot be changed)</Label>
        <Input type="email" value={member.email || ''} disabled className="bg-gray-50" />
        <p className="text-xs text-gray-400 mt-1">For security, emails cannot be changed. Delete and recreate if needed.</p>
      </div>
      <div>
        <Label>Access Role</Label>
        <Select value={accessRole} onValueChange={(v) => setAccessRole(v as UserRole)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Status</Label>
        <Select value={isActive ? 'active' : 'inactive'} onValueChange={(v) => setIsActive(v === 'active')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {error && <div className="text-sm text-destructive">{error}</div>}
      <Button className="w-full" onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}

export function TeamPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Staff | null>(null);
  const { staff, isLoading, deleteStaff } = useStaff();

  // Hide Admins from this list to prevent accidental self-deletion or editing of top-level admins
  const teamMembers = staff.filter(s => s.hasSystemAccess && s.accessRole !== 'admin');

  const handleDelete = async (member: Staff) => {
    const confirmed = await confirmAction({
      title: `Delete ${member.name}?`,
      description: 'This will revoke their access to the system. This action is recorded in the audit log.',
      confirmLabel: 'Delete Login',
      variant: 'destructive',
    });
    if (!confirmed) return;
    await deleteStaff(member);
    toast({ title: 'Login deleted', description: `${member.name}'s access was revoked.` });
  };

  const columns: ColumnDef<Staff>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'email', header: 'Login Email' },
    {
      accessorKey: 'accessRole',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant="outline" className={row.original.accessRole === 'admin' ? 'text-primary border-primary' : ''}>
          {row.original.accessRole}
        </Badge>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <span className={row.original.isActive ? 'text-emerald-600 font-medium' : 'text-gray-400 font-medium'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const member = row.original;
        return (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="icon" onClick={() => setEditingMember(member)}>
              <Pencil className="h-4 w-4 text-gray-500" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(member)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UserCog}
        title="Team & Logins"
        description="Manager accounts that can sign in to this property. Admins can view and edit these accounts. Every edit or delete is recorded in the Audit Log."
        actions={<Button onClick={() => setIsAddOpen(true)}>Add Login</Button>}
      />

      {isLoading ? (
        <LoadingState label="Loading team..." />
      ) : teamMembers.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No logins yet"
          description="Add the first Manager login."
          action={<Button onClick={() => setIsAddOpen(true)}>Add Login</Button>}
        />
      ) : (
        <DataTable columns={columns} data={teamMembers} searchKey="name" />
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Login</DialogTitle>
          </DialogHeader>
          <AddLoginForm onSaved={() => setIsAddOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Login</DialogTitle>
          </DialogHeader>
          {editingMember && (
            <EditLoginForm member={editingMember} onSaved={() => setEditingMember(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
