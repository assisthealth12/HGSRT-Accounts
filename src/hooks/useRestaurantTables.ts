import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { RestaurantTable } from '@/domain/restaurant';

export function useRestaurantTables() {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['restaurantTables', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const q = query(
        collection(db, 'restaurantTables'),
        where('propertyId', '==', propertyId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RestaurantTable[];
    },
    enabled: !!propertyId,
  });
}
