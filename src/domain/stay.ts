import { BaseDocument, CustomFields } from './base';
import { Money } from './money';

export type StayStatus = 'Reserved' | 'In-House' | 'Checked-Out' | 'Cancelled' | 'No-Show';

export interface StayGuest {
  name: string;
  phone?: string;
  email?: string;
  identityDocumentType?: string;
  identityDocumentNumber?: string;
}

export interface StayRoomAssignment {
  id: string; // Unique assignment ID (needed for room moves)
  roomId: string;
  roomTypeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  nightlyRate: Money;
  mealPlanRate: Money;
  extraBedRate: Money;
}

export interface Stay extends BaseDocument {
  customerId: string; // The primary guest or company booking it
  companyId?: string; // Bill To company (B2B)
  guests: StayGuest[];
  adults: number;
  children: number;
  
  checkInDate: string; // YYYY-MM-DD
  expectedCheckOutDate: string; // YYYY-MM-DD
  actualCheckOutDate?: string;
  
  status: StayStatus;
  
  // A stay can have multiple room assignments if they move rooms
  roomAssignments: StayRoomAssignment[];
  
  source?: string; // e.g. 'Walk-In', 'MakeMyTrip', 'Direct Call'
  notes?: string;
  customFields?: CustomFields;
}
