import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { Staff } from '@/domain/staff';
import { useAuthStore } from '@/store/authStore';
import { z } from 'zod';
import { staffSchema } from '@/domain/schemas';
import { diffFields, excludeSoftDeleted } from '@/domain/audit';
import { logAudit } from '@/lib/audit';

export function useStaff() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const queryClient = useQueryClient();

  const staffQuery = useQuery({
    queryKey: ['staff', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const q = query(collection(db, 'staff'), where('propertyId', '==', propertyId));
      const snapshot = await getDocs(q);
      const staff = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Staff[];
      return excludeSoftDeleted(staff);
    },
    enabled: !!propertyId,
  });

  // Delegates to the createStaffLogin Cloud Function, which provisions the Firebase
  // Auth login (when email+password+accessRole are provided) server-side.
  const addStaffMutation = useMutation({
    mutationFn: async (newStaff: z.infer<typeof staffSchema>) => {
      if (!propertyId) throw new Error('No property ID');
      const createStaffLogin = httpsCallable(functions, 'sysadmin-createStaffLogin');
      const result = await createStaffLogin({ propertyId, staffData: newStaff });
      return result.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff', propertyId] }),
  });

  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, data, previous }: { id: string; data: Partial<Staff>; previous: Staff }) => {
      const updateData: any = { ...data, updatedAt: Date.now(), updatedBy: user?.uid ?? 'unknown' };
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
      await updateDoc(doc(db, 'staff', id), updateData);

      if (propertyId && user) {
        const changes = diffFields(previous, { ...previous, ...updateData });
        if (changes.length > 0) {
          await logAudit({
            propertyId,
            userId: user.uid,
            userRole: role,
            action: 'edit',
            entityType: 'staff',
            entityId: id,
            changes,
          });
        }
      }

      return { id, ...updateData };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff', propertyId] }),
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (staff: Staff) => {
      await updateDoc(doc(db, 'staff', staff.id), {
        deletedAt: Date.now(),
        deletedBy: user?.uid ?? 'unknown',
      });
      if (propertyId && user) {
        await logAudit({
          propertyId,
          userId: user.uid,
          userRole: role,
          action: 'delete',
          entityType: 'staff',
          entityId: staff.id,
          changes: staff,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff', propertyId] }),
  });

  return {
    staff: staffQuery.data ?? [],
    isLoading: staffQuery.isLoading,
    error: staffQuery.error,
    addStaff: addStaffMutation.mutateAsync,
    updateStaff: updateStaffMutation.mutateAsync,
    deleteStaff: deleteStaffMutation.mutateAsync,
  };
}
