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

// Firestore throws on any undefined value, including nested inside arrays/objects —
// deep-strip them so a stray `undefined` here never silently fails the whole write
// (which previously made callers like useDeleteBooking look like they'd failed even
// though the actual entity write had already succeeded, leaving stale cached lists
// until a hard refresh).
function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(stripUndefinedDeep) as unknown as T;
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(value as Record<string, any>)) {
      if (val !== undefined) cleaned[key] = stripUndefinedDeep(val);
    }
    return cleaned as T;
  }
  return value;
}

// Audit logging is best-effort, not a user-facing operation — callers await the
// real data write (a booking delete, a room edit, etc.) and then log it here. If
// this threw, it would fail the caller's whole mutation even though the real write
// already succeeded, which left the UI stuck showing stale data until a hard
// refresh. Swallow failures here instead so a broken audit entry never blocks
// the operation it's describing.
export async function logAudit(params: LogAuditParams) {
  try {
    await addDoc(collection(db, 'auditLogs'), stripUndefinedDeep({
      ...params,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error('logAudit failed (non-blocking):', error);
  }
}
