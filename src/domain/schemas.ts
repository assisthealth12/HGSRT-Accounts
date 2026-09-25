import { z } from 'zod';

// Reusable parts
const moneySchema = z.number().int().nonnegative('Amount must be non-negative');

export const propertySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  address: z.string().min(5, 'Address is required'),
  gstin: z.string().optional(),
  phone: z.string().min(10, 'Phone must be valid'),
  email: z.string().email('Invalid email address'),
  logoUrl: z.string().url('Invalid URL').optional(),
  settings: z.object({
    financialYearStartMonth: z.number().min(1).max(12),
    invoicePrefix: z.string().min(1),
    receiptPrefix: z.string().min(1),
    defaultDueDays: z.number().min(0),
    businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    nightAuditTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm'),
    defaultCheckInTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm'),
    defaultCheckOutTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm'),
    timezone: z.string(),
  }),
  active: z.boolean().default(true),
});

export const customerSchema = z.object({
  type: z.enum(['individual', 'company', 'travel_agent']),
  name: z.string().min(2, 'Name is required'),
  contactPerson: z.string().optional(),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  gstin: z.string().optional(),
  identityDocumentType: z.string().optional(),
  identityDocumentNumber: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().default(true),
  customFields: z.record(z.any()).optional(),
});

export const employeeSchema = z.object({
  employeeCode: z.string().min(1, 'Employee code is required'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  phone: z.string().min(10, 'Phone is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  department: z.string().min(2, 'Department is required'),
  designation: z.string().min(2, 'Designation is required'),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  leavingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  monthlySalary: moneySchema,
  role: z.enum(['admin', 'manager']).optional(),
  active: z.boolean().default(true),
  customFields: z.record(z.any()).optional(),
});

export const roomTypeSchema = z.object({
  name: z.string().min(2, 'Room type name is required'),
  baseRate: moneySchema,
  extraBedRate: moneySchema,
  baseOccupancy: z.number().int().min(1),
  maxOccupancy: z.number().int().min(1),
  active: z.boolean().default(true),
});

export const roomSchema = z.object({
  roomNumber: z.string().min(1, 'Room number is required'),
  roomTypeId: z.string().min(1, 'Room type is required'),
  floor: z.string().optional(),
  status: z.enum(['Available', 'Reserved', 'Occupied', 'Dirty', 'Maintenance', 'Blocked']),
  notes: z.string().optional(),
  active: z.boolean().default(true),
});

export const stayGuestSchema = z.object({
  name: z.string().min(2, 'Guest name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  identityDocumentType: z.string().optional(),
  identityDocumentNumber: z.string().optional(),
});

export const stayRoomAssignmentSchema = z.object({
  roomId: z.string().min(1, 'Room is required'),
  roomTypeId: z.string().min(1, 'Room type is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  nightlyRate: moneySchema,
  mealPlanRate: moneySchema.default(0),
  extraBedRate: moneySchema.default(0),
});

export const staySchema = z.object({
  customerId: z.string().min(1, 'Primary customer is required'),
  companyId: z.string().optional(),
  
  guests: z.array(stayGuestSchema).min(1, 'At least one guest is required'),
  adults: z.number().int().min(1),
  children: z.number().int().min(0).default(0),
  
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  expectedCheckOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  
  status: z.enum(['Reserved', 'In-House', 'Checked-Out', 'Cancelled', 'No-Show']),
  
  roomAssignments: z.array(stayRoomAssignmentSchema).min(1, 'At least one room assignment is required'),
  
  source: z.string().optional(),
  notes: z.string().optional(),
});

export const paymentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  amount: moneySchema,
  paymentMode: z.string().min(1, 'Payment mode is required'),
  referenceNumber: z.string().optional(),
  bankName: z.string().optional(),
  notes: z.string().optional(),
});
