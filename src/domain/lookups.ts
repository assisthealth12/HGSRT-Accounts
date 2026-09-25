import { BaseDocument } from './base';

export interface PaymentModeOption extends BaseDocument {
  name: string;
  active: boolean;
}

export interface ExpenseCategoryOption extends BaseDocument {
  name: string;
  active: boolean;
}
