import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { RestaurantDailySale } from '@/domain/restaurantDailySales';
import { excludeSoftDeleted, diffFields } from '@/domain/audit';
import { logAudit } from '@/lib/audit';

export function useRestaurantDailySales() {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['restaurantDailySales', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const q = query(
        collection(db, 'restaurantDailySales'),
        where('propertyId', '==', propertyId)
      );

      const snapshot = await getDocs(q);
      const sales = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as RestaurantDailySale[];
      return excludeSoftDeleted(sales).sort((a, b) => a.saleDate.localeCompare(b.saleDate));
    },
    enabled: !!propertyId,
  });
}

// One doc per property per date (deterministic id) — re-saving the same date
// always updates that one row, matching "one entry per calendar date".
export function useUpsertRestaurantDailySale() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saleDate,
      onlineAmount,
      cashAmount,
      pendingAmount,
      pendingNotes,
      existing,
    }: {
      saleDate: string;
      onlineAmount: number;
      cashAmount: number;
      pendingAmount: number;
      pendingNotes?: string;
      existing?: RestaurantDailySale;
    }) => {
      if (!propertyId || !user) throw new Error('Not authenticated');

      const docId = existing?.id ?? `${propertyId}_${saleDate}`;
      const docRef = doc(db, 'restaurantDailySales', docId);

      const data = {
        saleDate,
        onlineAmount,
        cashAmount,
        pendingAmount,
        pendingNotes: pendingNotes ?? '',
        propertyId,
        createdAt: existing?.createdAt ?? Date.now(),
        createdBy: existing?.createdBy ?? user.uid,
        updatedAt: Date.now(),
        updatedBy: user.uid,
      };

      await setDoc(docRef, data, { merge: true });

      if (existing) {
        const changes = diffFields(existing, { ...existing, ...data });
        if (changes.length > 0) {
          await logAudit({
            propertyId,
            userId: user.uid,
            userRole: role,
            action: 'edit',
            entityType: 'restaurantDailySale',
            entityId: docId,
            changes,
          });
        }
      }

      return { id: docId, ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantDailySales', propertyId] });
    },
  });
}

export function useDeleteRestaurantDailySale() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!propertyId || !user) throw new Error('Not authenticated');
      const docRef = doc(db, 'restaurantDailySales', id);
      
      // Perform soft delete
      await setDoc(docRef, { 
        deletedAt: Date.now(), 
        deletedBy: user.uid 
      }, { merge: true });

      await logAudit({
        propertyId,
        userId: user.uid,
        userRole: role,
        action: 'delete',
        entityType: 'restaurantDailySale',
        entityId: id,
        changes: [{ field: 'deletedAt', oldValue: null, newValue: Date.now() }],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantDailySales', propertyId] });
    },
  });
}
