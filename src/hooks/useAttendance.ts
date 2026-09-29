import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { AttendanceRecord } from '@/domain/attendance';
import { diffFields } from '@/domain/audit';
import { logAudit } from '@/lib/audit';

export function useAttendance(date: string) {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['attendance', date, propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const q = query(
        collection(db, 'attendance'),
        where('propertyId', '==', propertyId),
        where('date', '==', date)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as AttendanceRecord[];
    },
    enabled: !!propertyId && !!date,
  });
}

// One doc per staff member per day, keyed deterministically so marking
// attendance twice for the same day updates the same record (upsert).
export function useMarkAttendance() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      staffId,
      date,
      status,
      existing,
    }: {
      staffId: string;
      date: string;
      status: 'present' | 'paid_leave' | 'absent';
      existing?: AttendanceRecord;
    }) => {
      if (!propertyId || !user) throw new Error('Not authenticated');

      const docId = existing?.id ?? `${staffId}_${date}`;
      const docRef = doc(db, 'attendance', docId);

      const data = {
        staffId,
        date,
        status,
        present: status === 'present', // fallback for legacy code still relying on boolean
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
            entityType: 'attendance',
            entityId: docId,
            changes,
          });
        }
      }

      return { id: docId, ...data };
    },
    onSuccess: () => {
      // Invalidate all attendance queries so both Daily and Monthly views update immediately
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}
