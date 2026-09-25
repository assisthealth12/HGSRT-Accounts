import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { z } from 'zod';
import { roomSchema } from '@/domain/schemas';
import { Room } from '@/domain/room';
import { diffFields } from '@/domain/audit';
import { logAudit } from '@/lib/audit';

export function useCreateRoom() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newRoom: z.infer<typeof roomSchema>) => {
      if (!propertyId) throw new Error('No property ID');

      const roomData = {
        ...newRoom,
        propertyId,
        createdAt: Date.now(),
        createdBy: user?.uid ?? 'unknown',
        updatedAt: Date.now(),
        updatedBy: user?.uid ?? 'unknown',
      };

      const docRef = await addDoc(collection(db, 'rooms'), roomData);
      return { id: docRef.id, ...roomData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', propertyId] });
    },
  });
}

export function useUpdateRoom() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data, previous }: { id: string; data: z.infer<typeof roomSchema>; previous: Room }) => {
      const updateData = { ...data, updatedAt: Date.now(), updatedBy: user?.uid ?? 'unknown' };
      await updateDoc(doc(db, 'rooms', id), updateData);

      if (propertyId && user) {
        const changes = diffFields(previous, { ...previous, ...updateData });
        if (changes.length > 0) {
          await logAudit({
            propertyId,
            userId: user.uid,
            userRole: role,
            action: 'edit',
            entityType: 'room',
            entityId: id,
            changes,
          });
        }
      }

      return { id, ...updateData };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms', propertyId] }),
  });
}

export function useDeleteRoom() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (room: Room) => {
      await updateDoc(doc(db, 'rooms', room.id), {
        deletedAt: Date.now(),
        deletedBy: user?.uid ?? 'unknown',
      });
      if (propertyId && user) {
        await logAudit({
          propertyId,
          userId: user.uid,
          userRole: role,
          action: 'delete',
          entityType: 'room',
          entityId: room.id,
          changes: room,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms', propertyId] }),
  });
}
