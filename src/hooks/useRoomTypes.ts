import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { RoomType } from '@/domain/room';
import { excludeSoftDeleted } from '@/domain/audit';

export function useRoomTypes() {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['roomTypes', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const q = query(
        collection(db, 'roomTypes'),
        where('propertyId', '==', propertyId)
      );

      const snapshot = await getDocs(q);
      const roomTypes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RoomType[];
      return excludeSoftDeleted(roomTypes);
    },
    enabled: !!propertyId,
  });
}
