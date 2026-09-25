import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { Expense } from '@/domain/expense';

export function useExpenses() {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['expenses', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const q = query(
        collection(db, 'expenses'),
        where('propertyId', '==', propertyId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Expense[];
    },
    enabled: !!propertyId,
  });
}
