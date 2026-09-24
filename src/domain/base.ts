export interface BaseDocument {
  id: string;
  propertyId: string;
  createdAt: number; // Storing as Unix timestamp for easier serialization, or can be Firestore Timestamp
  createdBy: string; // User ID
  updatedAt: number;
  updatedBy: string;
}

export type CustomFields = Record<string, any>;
