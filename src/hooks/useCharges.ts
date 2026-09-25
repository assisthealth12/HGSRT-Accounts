import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { Charge } from '@/domain/charge';

export function useCharges(stayId?: string) {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['charges', stayId ?? 'all', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const clauses = [where('propertyId', '==', propertyId)];
      if (stayId) clauses.push(where('stayId', '==', stayId));

      const q = query(collection(db, 'charges'), ...clauses);

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Charge[];
    },
    enabled: !!propertyId,
  });
}
