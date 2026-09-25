import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FieldChange } from '@/domain/audit';

export type AuditAction = 'create' | 'edit' | 'delete';

interface LogAuditParams {
  propertyId: string;
  userId: string;
  userRole?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  changes?: FieldChange[] | Record<string, any>;
}

export async function logAudit(params: LogAuditParams) {
  await addDoc(collection(db, 'auditLogs'), {
    ...params,
    timestamp: Date.now(),
  });
}
