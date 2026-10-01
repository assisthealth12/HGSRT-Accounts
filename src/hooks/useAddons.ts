import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { excludeSoftDeleted } from '@/domain/audit';
import { logAudit } from '@/lib/audit';

export interface Addon {
  id: string;
  name: string;
  price: number; // in paise
  active: boolean;
  propertyId: string;
}

export function useAddons() {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['addons', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const q = query(collection(db, 'addons'), where('propertyId', '==', propertyId));
      const snapshot = await getDocs(q);
      const addons = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Addon[];
      return excludeSoftDeleted(addons).filter(a => a.active);
    },
    enabled: !!propertyId,
  });
}

export function useCreateAddon() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string, price: number }) => {
      if (!propertyId) throw new Error('No property ID');
      const payload = {
        ...data,
        active: true,
        propertyId,
        createdAt: Date.now(),
        createdBy: user?.uid ?? 'unknown',
        updatedAt: Date.now(),
        updatedBy: user?.uid ?? 'unknown',
      };
      const docRef = await addDoc(collection(db, 'addons'), payload);
      return { id: docRef.id, ...payload };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addons', propertyId] }),
  });
}

export function useDeleteAddon() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (addon: Addon) => {
      await updateDoc(doc(db, 'addons', addon.id), {
        deletedAt: Date.now(),
        deletedBy: user?.uid ?? 'unknown',
      });
      if (propertyId && user) {
        await logAudit({
          propertyId,
          userId: user.uid,
          userRole: role,
          action: 'delete',
          entityType: 'addon',
          entityId: addon.id,
          changes: addon,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addons', propertyId] }),
  });
}
