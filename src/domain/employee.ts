import { BaseDocument, CustomFields } from './base';
import { Money } from './money';

export interface Employee extends BaseDocument {
  employeeCode: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  department: string;
  designation: string;
  joiningDate: string; // YYYY-MM-DD
  leavingDate?: string; // YYYY-MM-DD
  monthlySalary: Money;
  active: boolean;
  customFields?: CustomFields;
}
