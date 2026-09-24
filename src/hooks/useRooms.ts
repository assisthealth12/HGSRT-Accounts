import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';

export function useRooms() {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['rooms', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      
      const q = query(
        collection(db, 'rooms'),
        where('propertyId', '==', propertyId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[]; // In a real app, type this strictly to Room
    },
    enabled: !!propertyId,
  });
}
