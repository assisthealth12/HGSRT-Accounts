import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { Payment } from '@/domain/payment';

export function usePayments(customerId?: string) {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['payments', customerId ?? 'all', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const clauses = [where('propertyId', '==', propertyId)];
      if (customerId) clauses.push(where('customerId', '==', customerId));

      const q = query(collection(db, 'payments'), ...clauses);

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Payment[];
    },
    enabled: !!propertyId,
  });
}
