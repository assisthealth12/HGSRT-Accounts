import { useQuery } from '@tanstack/react-query';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { AuditAction } from '@/lib/audit';
import { FieldChange } from '@/domain/audit';

export interface AuditLogEntry {
  id: string;
  propertyId: string;
  userId: string;
  userRole?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  changes?: FieldChange[] | Record<string, any>;
  timestamp: number;
}

export function useAuditLogs() {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['auditLogs', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const q = query(
        collection(db, 'auditLogs'),
        where('propertyId', '==', propertyId),
        orderBy('timestamp', 'desc'),
        limit(200)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as AuditLogEntry[];
    },
    enabled: !!propertyId,
  });
}
