import { BaseDocument } from './base';

export interface PaymentModeOption extends BaseDocument {
  name: string;
  sortOrder: number;
  active: boolean;
}

export interface ExpenseCategoryOption extends BaseDocument {
  name: string;
  sortOrder: number;
  active: boolean;
}
