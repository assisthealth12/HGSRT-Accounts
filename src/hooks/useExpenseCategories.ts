import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { ExpenseCategoryOption } from '@/domain/lookups';
import { excludeSoftDeleted } from '@/domain/audit';
import { logAudit } from '@/lib/audit';

export function useExpenseCategories() {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['expenseCategories', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const q = query(collection(db, 'expenseCategories'), where('propertyId', '==', propertyId));
      const snapshot = await getDocs(q);
      const categories = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ExpenseCategoryOption[];
      return excludeSoftDeleted(categories).filter(c => c.active);
    },
    enabled: !!propertyId,
  });
}

export function useCreateExpenseCategory() {
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
      const docRef = await addDoc(collection(db, 'expenseCategories'), data);
      return { id: docRef.id, ...data };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenseCategories', propertyId] }),
  });
}

export function useDeleteExpenseCategory() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: ExpenseCategoryOption) => {
      await updateDoc(doc(db, 'expenseCategories', category.id), {
        deletedAt: Date.now(),
        deletedBy: user?.uid ?? 'unknown',
      });
      if (propertyId && user) {
        await logAudit({
          propertyId,
          userId: user.uid,
          userRole: role,
          action: 'delete',
          entityType: 'expenseCategory',
          entityId: category.id,
          changes: category,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenseCategories', propertyId] }),
  });
}
