import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Stay } from '@/domain/stay';

export function useStay(stayId?: string) {
  return useQuery({
    queryKey: ['stays', 'one', stayId],
    queryFn: async () => {
      if (!stayId) return null;

      const snapshot = await getDoc(doc(db, 'stays', stayId));
      if (!snapshot.exists()) return null;

      return { id: snapshot.id, ...snapshot.data() } as Stay;
    },
    enabled: !!stayId,
  });
}
