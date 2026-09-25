import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { PaymentModeOption } from '@/domain/lookups';
import { excludeSoftDeleted } from '@/domain/audit';
import { logAudit } from '@/lib/audit';

export function usePaymentModes() {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['paymentModes', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const q = query(collection(db, 'paymentModes'), where('propertyId', '==', propertyId));
      const snapshot = await getDocs(q);
      const modes = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as PaymentModeOption[];
      return excludeSoftDeleted(modes).filter(m => m.active);
    },
    enabled: !!propertyId,
  });
}

export function useCreatePaymentMode() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!propertyId) throw new Error('No property ID');
      const data = {
        name,
        active: true,
        propertyId,
        createdAt: Date.now(),
        createdBy: user?.uid ?? 'unknown',
        updatedAt: Date.now(),
        updatedBy: user?.uid ?? 'unknown',
      };
      const docRef = await addDoc(collection(db, 'paymentModes'), data);
      return { id: docRef.id, ...data };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paymentModes', propertyId] }),
  });
}

export function useDeletePaymentMode() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mode: PaymentModeOption) => {
      await updateDoc(doc(db, 'paymentModes', mode.id), {
        deletedAt: Date.now(),
        deletedBy: user?.uid ?? 'unknown',
      });
      if (propertyId && user) {
        await logAudit({
          propertyId,
          userId: user.uid,
          userRole: role,
          action: 'delete',
          entityType: 'paymentMode',
          entityId: mode.id,
          changes: mode,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paymentModes', propertyId] }),
  });
}
