import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { PayrollPayment } from '@/domain/payrollPayment';
import { z } from 'zod';
import { payrollPaymentSchema } from '@/domain/schemas';

export function usePayrollPayments() {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['payrollPayments', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const q = query(collection(db, 'payrollPayments'), where('propertyId', '==', propertyId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as PayrollPayment[];
    },
    enabled: !!propertyId,
  });
}

export function useRecordPayrollPayment() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: z.infer<typeof payrollPaymentSchema>) => {
      if (!propertyId || !user) throw new Error('Not authenticated');

      const data: any = {
        ...payment,
        propertyId,
        createdAt: Date.now(),
        createdBy: user.uid,
        updatedAt: Date.now(),
        updatedBy: user.uid,
      };

      Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

      const docRef = await addDoc(collection(db, 'payrollPayments'), data);
      return { id: docRef.id, ...data };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payrollPayments', propertyId] }),
  });
}
