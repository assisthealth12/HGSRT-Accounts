import { BaseDocument, CustomFields } from './base';

export type CustomerType = 'individual' | 'company' | 'travel_agent';

export interface Customer extends BaseDocument {
  type: CustomerType;
  name: string; // Full name or Company name
  contactPerson?: string; // If company
  phone: string;
  email?: string;
  address?: string;
  gstin?: string; // Important for B2B billing
  identityDocumentType?: string; // e.g., Aadhaar, Passport
  identityDocumentNumber?: string;
  notes?: string;
  active: boolean;
  customFields?: CustomFields;
}
