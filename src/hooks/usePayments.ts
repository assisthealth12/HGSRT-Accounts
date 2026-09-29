import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { Payment } from '@/domain/payment';
import { z } from 'zod';
import { paymentSchema } from '@/domain/schemas';

export function usePayments(bookingId?: string) {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['payments', bookingId ?? 'all', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const clauses = [where('propertyId', '==', propertyId)];
      if (bookingId) clauses.push(where('bookingId', '==', bookingId));

      const q = query(collection(db, 'payments'), ...clauses);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Payment[];
    },
    enabled: !!propertyId,
  });
}

export function useRecordPayment() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: z.infer<typeof paymentSchema>) => {
      if (!propertyId || !user) throw new Error('Not authenticated');

      const data: any = {
        ...payment,
        propertyId,
        createdAt: Date.now(),
        createdBy: user.uid,
        updatedAt: Date.now(),
        updatedBy: user.uid,
      };

      // Firestore throws an error if any field is undefined. Strip them out.
      Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

      const docRef = await addDoc(collection(db, 'payments'), data);
      return { id: docRef.id, ...data };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments', variables.bookingId, propertyId] });
      queryClient.invalidateQueries({ queryKey: ['payments', 'all', propertyId] });
    },
  });
}
