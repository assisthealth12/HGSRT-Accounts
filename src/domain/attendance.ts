import { BaseDocument } from './base';

export interface AttendanceRecord extends BaseDocument {
  staffId: string;
  date: string; // YYYY-MM-DD
  present?: boolean; // legacy
  status?: 'present' | 'paid_leave' | 'absent'; // new
}

export function getAttendanceStatus(record: { present?: boolean; status?: 'present' | 'paid_leave' | 'absent' }): 'present' | 'paid_leave' | 'absent' {
  if (record.status) return record.status;
  if (record.present === true) return 'present';
  if (record.present === false) return 'absent';
  return 'absent'; // default fallback
}
