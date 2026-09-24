import { BaseDocument } from './base';

export interface PropertySettings {
  financialYearStartMonth: number; // e.g., 4 for April (India standard)
  invoicePrefix: string;
  receiptPrefix: string;
  defaultDueDays: number;
  businessDate: string; // YYYY-MM-DD
  nightAuditTime: string; // HH:mm
  defaultCheckInTime: string; // HH:mm
  defaultCheckOutTime: string; // HH:mm
  timezone: string; // e.g., 'Asia/Kolkata'
}

export interface Property extends BaseDocument {
  name: string;
  address: string;
  gstin: string;
  phone: string;
  email: string;
  logoUrl?: string;
  settings: PropertySettings;
  active: boolean;
}
