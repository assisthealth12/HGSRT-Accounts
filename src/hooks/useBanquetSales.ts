import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { BanquetSale } from '@/domain/banquet';
import { excludeSoftDeleted } from '@/domain/audit';

export function useBanquetSales() {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['banquetSales', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const q = query(
        collection(db, 'banquetSales'),
        where('propertyId', '==', propertyId)
      );

      const snapshot = await getDocs(q);
      const sales = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as BanquetSale[];
      return excludeSoftDeleted(sales);
    },
    enabled: !!propertyId,
  });
}

export function useCreateBanquetSale() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sale: { date: string; eventName: string; onlineAmount: number; cashAmount: number }) => {
      if (!propertyId) throw new Error('No property ID');

      const data = {
        ...sale,
        propertyId,
        createdAt: Date.now(),
        createdBy: user?.uid ?? 'unknown',
        updatedAt: Date.now(),
        updatedBy: user?.uid ?? 'unknown',
      };

      const docRef = await addDoc(collection(db, 'banquetSales'), data);
      return { id: docRef.id, ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banquetSales', propertyId] });
    },
  });
}
