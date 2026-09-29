import { z } from 'zod';

// Reusable parts
const moneySchema = z.number().int().nonnegative('Amount must be non-negative');
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

export const roomTypeSchema = z.object({
  name: z.string().min(2, 'Room type name is required'),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const roomSchema = z.object({
  roomNumber: z.string().min(1, 'Room number is required'),
  roomTypeId: z.string().min(1, 'Room type is required'),
  floor: z.string().optional(),
  baseTariff: moneySchema,
  isActive: z.boolean().default(true),
});

export const bookingSchema = z.object({
  guestName: z.string().min(2, 'Guest name is required'),
  occupancy: z.enum(['Single', 'Double', 'Triple']),
  roomIds: z.array(z.string()).min(1, 'At least one room is required'),
  checkIn: dateSchema,
  checkOut: dateSchema,
  nights: z.number().int().min(1),
  tariff: moneySchema,
  gst: moneySchema.default(0),
  addonAmount: moneySchema.default(0),
  discount: moneySchema.default(0),
  remarks: z.string().optional(),
});

export const paymentSchema = z.object({
  bookingId: z.string().min(1, 'Booking is required'),
  amount: moneySchema,
  paymentModeId: z.string().min(1, 'Payment mode is required'),
  paidOn: dateSchema,
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
});

export const staffSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
  monthlySalary: moneySchema,
  isActive: z.boolean().default(true),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  accessRole: z.enum(['admin', 'manager']).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

export const payrollPaymentSchema = z.object({
  staffId: z.string().min(1, 'Staff member is required'),
  amount: moneySchema,
  paymentModeId: z.string().min(1, 'Payment mode is required'),
  paidOn: dateSchema,
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
});

export const expenseCategorySchema = z.object({
  name: z.string().min(2, 'Category name is required'),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const expenseSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  vendorName: z.string().min(1, 'Vendor name is required'),
  description: z.string().optional(),
  billAmount: moneySchema,
  orderDate: dateSchema,
  deliveryDate: dateSchema.optional(),
  paymentModeId: z.string().min(1, 'Payment mode is required'),
  paidOn: dateSchema,
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
});

export const paymentModeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const banquetBookingSchema = z.object({
  customerName: z.string().min(2, 'Customer name is required'),
  eventDate: dateSchema,
  eventType: z.string().optional(),
  quotedAmount: moneySchema,
  remarks: z.string().optional(),
});
