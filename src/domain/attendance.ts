import { BaseDocument } from './base';

export interface AttendanceRecord extends BaseDocument {
  staffId: string;
  date: string; // YYYY-MM-DD
  present: boolean;
}
