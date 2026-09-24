import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';

export function useCustomers() {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['customers', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      
      const q = query(
        collection(db, 'customers'),
        where('propertyId', '==', propertyId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
    },
    enabled: !!propertyId,
  });
}
