import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { Booking, datesOverlap } from '@/domain/booking';
import { excludeSoftDeleted, diffFields } from '@/domain/audit';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';
import { bookingSchema } from '@/domain/schemas';

export function useBookings() {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['bookings', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const q = query(collection(db, 'bookings'), where('propertyId', '==', propertyId));
      const snapshot = await getDocs(q);
      const bookings = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Booking[];
      return excludeSoftDeleted(bookings).sort((a, b) => b.checkIn.localeCompare(a.checkIn));
    },
    enabled: !!propertyId,
  });
}

// Scoped by check-in date (inclusive) instead of fetching every booking ever made —
// keeps read volume and page-load time flat as the collection grows across years,
// instead of growing with total lifetime booking count.
export function useBookingsInRange(startDate: string, endDate: string) {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['bookings', propertyId, 'range', startDate, endDate],
    queryFn: async () => {
      if (!propertyId) return [];

      const q = query(
        collection(db, 'bookings'),
        where('propertyId', '==', propertyId),
        where('checkIn', '>=', startDate),
        where('checkIn', '<=', endDate),
      );
      const snapshot = await getDocs(q);
      const bookings = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Booking[];
      return excludeSoftDeleted(bookings).sort((a, b) => b.checkIn.localeCompare(a.checkIn));
    },
    enabled: !!propertyId,
  });
}

// For "what's the state of my rooms right now" views: a stay can have started before
// the date being viewed, so we look back far enough to catch any booking still active
// on that date (hotel stays are essentially never longer than this), then the caller
// filters to checkOut > date client-side. Bounded lookback = bounded reads forever.
const LIVE_STATUS_LOOKBACK_DAYS = 120;

export function useActiveBookingsAround(date: string) {
  const start = new Date(date);
  start.setDate(start.getDate() - LIVE_STATUS_LOOKBACK_DAYS);
  const startDate = start.toISOString().slice(0, 10);
  return useBookingsInRange(startDate, date);
}

export function useCreateBooking() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (booking: z.infer<typeof bookingSchema>) => {
      if (!propertyId || !user) throw new Error('Not authenticated');

      // Guard against double-booking the same room for overlapping dates.
      const existingQuery = query(
        collection(db, 'bookings'),
        where('propertyId', '==', propertyId),
        where('roomIds', 'array-contains-any', booking.roomIds)
      );
      const existingSnapshot = await getDocs(existingQuery);
      const conflict = existingSnapshot.docs
        .map(d => ({ id: d.id, ...d.data() })) as Booking[];
      const hasOverlap = excludeSoftDeleted(conflict).some(b =>
        datesOverlap(booking.checkIn, booking.checkOut, b.checkIn, b.checkOut)
      );
      if (hasOverlap) {
        throw new Error('One or more of the selected rooms are already booked for an overlapping date range.');
      }

      const data: any = {
        ...booking,
        propertyId,
        createdAt: Date.now(),
        createdBy: user.uid,
        updatedAt: Date.now(),
        updatedBy: user.uid,
      };

      // Firestore throws an error if any field is undefined. Strip them out.
      Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

      const docRef = await addDoc(collection(db, 'bookings'), data);
      return { id: docRef.id, ...data };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings', propertyId] }),
  });
}

export function useUpdateBooking() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data, previous }: { id: string; data: z.infer<typeof bookingSchema>; previous: Booking }) => {
      const updateData: any = { ...data, updatedAt: Date.now(), updatedBy: user?.uid ?? 'unknown' };
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
      await updateDoc(doc(db, 'bookings', id), updateData);

      if (propertyId && user) {
        const changes = diffFields(previous, { ...previous, ...updateData });
        if (changes.length > 0) {
          await logAudit({
            propertyId,
            userId: user.uid,
            userRole: role,
            action: 'edit',
            entityType: 'booking',
            entityId: id,
            changes,
          });
        }
      }

      return { id, ...updateData };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings', propertyId] }),
  });
}

export function useDeleteBooking() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!propertyId || !user) throw new Error('Not authenticated');
      await updateDoc(doc(db, 'bookings', id), { deletedAt: Date.now(), deletedBy: user.uid });
      
      await logAudit({
        propertyId,
        userId: user.uid,
        userRole: role,
        action: 'delete',
        entityType: 'booking',
        entityId: id,
        changes: [{ field: 'deletedAt', oldValue: null, newValue: Date.now() }],
      });
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings', propertyId] }),
  });
}
