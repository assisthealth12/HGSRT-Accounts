import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { MenuItem } from '@/domain/restaurant';

export function useMenuItems() {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['menuItems', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const q = query(
        collection(db, 'menuItems'),
        where('propertyId', '==', propertyId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MenuItem[];
    },
    enabled: !!propertyId,
  });
}
