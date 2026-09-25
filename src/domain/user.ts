import { BaseDocument } from './base';

export type UserRole = 'admin' | 'manager';

export interface AppUser extends BaseDocument {
  uid: string; // Firebase Auth UID
  email: string;
  displayName: string;
  role: UserRole;
  employeeId?: string; // Link to an Employee record if applicable
  active: boolean;
  lastLoginAt?: number;
}
