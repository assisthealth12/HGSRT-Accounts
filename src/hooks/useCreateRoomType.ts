import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { RoomType, OccupancyRates } from '@/domain/room';
import { diffFields } from '@/domain/audit';
import { logAudit } from '@/lib/audit';

export function useCreateRoomType() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomType: { name: string; sortOrder: number; rates?: OccupancyRates }) => {
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

export function useUpdateRoomType() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data, previous }: { id: string; data: { name: string; rates?: OccupancyRates }; previous: RoomType }) => {
      const updateData = { ...data, updatedAt: Date.now(), updatedBy: user?.uid ?? 'unknown' };
      await updateDoc(doc(db, 'roomTypes', id), updateData);

      if (propertyId && user) {
        const changes = diffFields(previous, { ...previous, ...updateData });
        if (changes.length > 0) {
          await logAudit({
            propertyId,
            userId: user.uid,
            userRole: role,
            action: 'edit',
            entityType: 'roomType',
            entityId: id,
            changes,
          });
        }
      }

      return { id, ...updateData };
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
