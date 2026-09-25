export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}

const IGNORED_FIELDS = new Set(['id', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy']);

export function diffFields(before: Record<string, any> = {}, after: Record<string, any> = {}): FieldChange[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: FieldChange[] = [];

  keys.forEach((key) => {
    if (IGNORED_FIELDS.has(key)) return;
    const oldValue = before[key];
    const newValue = after[key];
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({ field: key, oldValue: oldValue ?? null, newValue: newValue ?? null });
    }
  });

  return changes;
}

export function excludeSoftDeleted<T extends { deletedAt?: number }>(docs: T[]): T[] {
  return docs.filter((d) => !d.deletedAt);
}
