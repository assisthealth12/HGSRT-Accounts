export interface BaseDocument {
  id: string;
  propertyId: string;
  createdAt: number; // Storing as Unix timestamp for easier serialization, or can be Firestore Timestamp
  createdBy: string; // User ID
  updatedAt: number;
  updatedBy: string;
  deletedAt?: number; // Soft-delete marker — set instead of physically removing the doc
  deletedBy?: string;
}

export type CustomFields = Record<string, any>;
