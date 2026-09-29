import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updatePassword } from 'firebase/auth';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/hooks/use-toast';
import { KeyRound, Eye, EyeOff, User } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';

export function ProfilePage() {
  const user = useAuthStore(state => state.user);
  const role = useAuthStore(state => state.role);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleUpdate = async () => {
    if (!user || newPassword.length < 6) return;
    setIsUpdating(true);
    try {
      await updatePassword(user, newPassword);
      toast({ title: 'Success', description: 'Your password has been updated.' });
      setNewPassword('');
    } catch (e: any) {
      toast({ title: 'Failed to update password', description: e.message || 'Please sign out and sign back in to try again.', variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <PageHeader
        icon={User}
        title="My Profile"
        description="Manage your personal account settings and security."
      />

      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
        <div className="bg-emerald-600 p-6 text-white">
          <CardTitle className="text-2xl font-extrabold flex items-center gap-2">
            <KeyRound className="w-6 h-6" /> 
            Security Settings
          </CardTitle>
          <p className="text-emerald-100 mt-1 text-sm">Update your password to keep your account secure.</p>
        </div>
        
        <CardContent className="p-8 space-y-6 bg-gray-50/50">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-5">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 block">Login Email</label>
              <Input disabled value={user?.email || ''} className="h-12 rounded-xl bg-gray-50 border-gray-200 text-gray-600 font-medium" />
            </div>
            
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 block">Current Role</label>
              <Input disabled value={role || ''} className="h-12 rounded-xl bg-gray-50 border-gray-200 text-gray-600 font-medium capitalize" />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 block">New Password</label>
              <div className="relative">
                <Input 
                  type={showPassword ? 'text' : 'password'} 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  placeholder="At least 6 characters" 
                  className="h-12 rounded-xl bg-white border-gray-200 pr-12 font-medium" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
          
          <Button 
            className="w-full h-14 rounded-xl text-lg font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all" 
            onClick={handleUpdate} 
            disabled={isUpdating || newPassword.length < 6}
          >
            {isUpdating ? 'Updating...' : 'Change Password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
