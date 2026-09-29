import { BaseDocument } from './base';
import { Money } from './money';
import { UserRole } from './user';

export interface Staff extends BaseDocument {
  name: string;
  role: string; // Job role/title, e.g. 'Housekeeping', 'Front Desk', 'Cook' — free text per spec
  monthlySalary: Money;
  isActive: boolean;
  email?: string;
  accessRole?: UserRole; // 'admin' | 'manager' — only set when this staff member has a system login
  hasSystemAccess?: boolean;
}
