import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { RoomType } from '@/domain/room';
import { logAudit } from '@/lib/audit';

export function useCreateRoomType() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomType: { name: string; baseRate: number; extraBedRate: number; baseOccupancy: number; maxOccupancy: number }) => {
      if (!propertyId) throw new Error('No property ID');
      const data = {
        ...roomType,
        active: true,
        propertyId,
        createdAt: Date.now(),
        createdBy: user?.uid ?? 'unknown',
        updatedAt: Date.now(),
        updatedBy: user?.uid ?? 'unknown',
      };
      const docRef = await addDoc(collection(db, 'roomTypes'), data);
      return { id: docRef.id, ...data };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roomTypes', propertyId] }),
  });
}

export function useDeleteRoomType() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomType: RoomType) => {
      await updateDoc(doc(db, 'roomTypes', roomType.id), {
        deletedAt: Date.now(),
        deletedBy: user?.uid ?? 'unknown',
      });
      if (propertyId && user) {
        await logAudit({
          propertyId,
          userId: user.uid,
          userRole: role,
          action: 'delete',
          entityType: 'roomType',
          entityId: roomType.id,
          changes: roomType,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roomTypes', propertyId] }),
  });
}
