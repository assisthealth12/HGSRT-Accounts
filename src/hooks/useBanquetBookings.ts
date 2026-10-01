import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, onSnapshot, setDoc, getDocs, query, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { BanquetBooking } from '@/domain/banquetBooking';
import { banquetBookingSchema } from '@/domain/schemas';

export function useBanquetBookings() {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['banquetBookings', propertyId],
    queryFn: () => {
      if (!propertyId) return Promise.resolve([]);
      return new Promise<BanquetBooking[]>((resolve, reject) => {
        const q = query(collection(db, 'banquetBookings'), where('propertyId', '==', propertyId));
        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BanquetBooking));
            resolve(data);
          },
          reject
        );
      });
    },
    enabled: !!propertyId,
    staleTime: Infinity,
  });
}

export function useCreateBanquetBooking() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<BanquetBooking, 'id' | 'propertyId' | 'createdAt'>) => {
      if (!propertyId) throw new Error('No property context');
      
      const parsed = banquetBookingSchema.parse(data);
      const newRef = doc(collection(db, 'banquetBookings'));
      
      const booking: any = {
        id: newRef.id,
        propertyId,
        ...parsed,
        createdAt: new Date().toISOString(),
      };

      // Firestore throws an error if any field is undefined. Strip them out.
      Object.keys(booking).forEach(key => booking[key] === undefined && delete booking[key]);

      await setDoc(newRef, booking);
      return booking as BanquetBooking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banquetBookings'] });
    },
  });
}

export function useUpdateBanquetBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<BanquetBooking> & { id: string }) => {
      const docRef = doc(db, 'banquetBookings', id);
      const cleaned: any = { ...data };
      Object.keys(cleaned).forEach(key => cleaned[key] === undefined && delete cleaned[key]);
      await updateDoc(docRef, cleaned);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banquetBookings'] });
    },
  });
}

export function useDeleteBanquetBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const docRef = doc(db, 'banquetBookings', id);
      await deleteDoc(docRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banquetBookings'] });
    },
  });
}
