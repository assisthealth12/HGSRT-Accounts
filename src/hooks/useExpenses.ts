import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { Expense } from '@/domain/expense';
import { z } from 'zod';
import { expenseSchema } from '@/domain/schemas';

export function useExpenses() {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['expenses', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const q = query(collection(db, 'expenses'), where('propertyId', '==', propertyId));
      const snapshot = await getDocs(q);
      const expenses = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Expense[];
      return expenses.sort((a, b) => b.paidOn.localeCompare(a.paidOn));
    },
    enabled: !!propertyId,
  });
}

export function useCreateExpense() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: z.infer<typeof expenseSchema>) => {
      if (!propertyId || !user) throw new Error('Not authenticated');

      const data: any = {
        ...expense,
        propertyId,
        createdAt: Date.now(),
        createdBy: user.uid,
        updatedAt: Date.now(),
        updatedBy: user.uid,
      };

      Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

      const docRef = await addDoc(collection(db, 'expenses'), data);
      return { id: docRef.id, ...data };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses', propertyId] }),
  });
}
