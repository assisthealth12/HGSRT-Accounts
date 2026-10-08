import ExcelJS from 'exceljs';
import { Occupancy } from '@/domain/booking';
import { MealPlan, Room } from '@/domain/room';
import { HARDCODED_PAYMENT_MODES } from '@/hooks/usePaymentModes';

const VALID_OCCUPANCY: Occupancy[] = ['Single', 'Double', 'Triple'];
const VALID_MEAL_PLAN: MealPlan[] = ['EP', 'CP'];

export interface ParsedImportRow {
  rowNumber: number; // 1-indexed within the sheet, for error messages
  guestName: string;
  occupancy: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  tariff: number | null;
  gst: number | null;
  addonAmount: number | null;
  mealPlan: string;
  mealPlanAmount: number | null;
  mealPlanGst: number | null;
  discount: number | null;
  paymentMode: string;
  amountPaid: number | null;
  paymentDate: string;
  remarks: string;
}

export interface ValidatedImportRow extends ParsedImportRow {
  errors: string[];
  roomId: string | null;
  paymentModeId: string | null;
  nights: number | null;
  total: number | null; // for preview display only
}

function cellToDateString(value: ExcelJS.CellValue): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') return value.trim();
  return '';
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function cellToNumberOrNull(value: ExcelJS.CellValue): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(n) ? null : n;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function parseImportFile(file: File): Promise<ParsedImportRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.getWorksheet('Bookings Import');
  if (!sheet) {
    throw new Error('Could not find a "Bookings Import" sheet in this file. Use the provided template.');
  }

  const rows: ParsedImportRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header

    const values = row.values as ExcelJS.CellValue[]; // 1-indexed, [0] is empty
    const guestName = cellToString(values[1]);
    const occupancy = cellToString(values[2]);
    const roomNumber = cellToString(values[3]);
    const checkIn = cellToDateString(values[4]);
    const checkOut = cellToDateString(values[5]);
    const tariff = cellToNumberOrNull(values[6]);
    const gst = cellToNumberOrNull(values[7]);
    const addonAmount = cellToNumberOrNull(values[8]);
    const mealPlan = cellToString(values[9]);
    const mealPlanAmount = cellToNumberOrNull(values[10]);
    const mealPlanGst = cellToNumberOrNull(values[11]);
    const discount = cellToNumberOrNull(values[12]);
    const paymentMode = cellToString(values[13]);
    const amountPaid = cellToNumberOrNull(values[14]);
    const paymentDate = cellToDateString(values[15]);
    const remarks = cellToString(values[16]);

    // Skip fully blank rows
    if (!guestName && !roomNumber && tariff === null) return;

    rows.push({
      rowNumber,
      guestName,
      occupancy,
      roomNumber,
      checkIn,
      checkOut,
      tariff,
      gst,
      addonAmount,
      mealPlan,
      mealPlanAmount,
      mealPlanGst,
      discount,
      paymentMode,
      amountPaid,
      paymentDate,
      remarks,
    });
  });

  return rows;
}

export function validateRows(
  rows: ParsedImportRow[],
  activeRooms: Room[],
): ValidatedImportRow[] {
  const roomsByNumber = new Map<string, Room[]>();
  activeRooms.forEach(r => {
    const key = r.roomNumber.trim().toLowerCase();
    roomsByNumber.set(key, [...(roomsByNumber.get(key) || []), r]);
  });

  const paymentModesByName = new Map(
    HARDCODED_PAYMENT_MODES.map(pm => [pm.name.toLowerCase(), pm.id]),
  );

  return rows.map((row): ValidatedImportRow => {
    const errors: string[] = [];

    if (!row.guestName) errors.push('Guest Name is required');
    if (!VALID_OCCUPANCY.includes(row.occupancy as Occupancy)) {
      errors.push(`Occupancy must be Single/Double/Triple (got "${row.occupancy}")`);
    }

    const roomMatches = roomsByNumber.get(row.roomNumber.trim().toLowerCase()) || [];
    let roomId: string | null = null;
    if (!row.roomNumber) {
      errors.push('Room Number is required');
    } else if (roomMatches.length === 0) {
      errors.push(`Room "${row.roomNumber}" not found in Settings > Physical Rooms`);
    } else if (roomMatches.length > 1) {
      errors.push(`Room "${row.roomNumber}" is ambiguous — multiple active rooms share this number`);
    } else {
      roomId = roomMatches[0].id;
    }

    if (!DATE_RE.test(row.checkIn)) errors.push(`Check-in Date must be YYYY-MM-DD (got "${row.checkIn}")`);
    if (!DATE_RE.test(row.checkOut)) errors.push(`Check-out Date must be YYYY-MM-DD (got "${row.checkOut}")`);
    let nights: number | null = null;
    if (DATE_RE.test(row.checkIn) && DATE_RE.test(row.checkOut)) {
      const d1 = new Date(row.checkIn);
      const d2 = new Date(row.checkOut);
      const diffDays = Math.round((d2.getTime() - d1.getTime()) / 86400000);
      if (diffDays <= 0) {
        errors.push('Check-out Date must be after Check-in Date');
      } else {
        nights = diffDays;
      }
    }

    if (row.tariff === null || row.tariff < 0) errors.push('Tariff is required and must be a positive number');
    if (row.gst !== null && row.gst < 0) errors.push('GST cannot be negative');
    if (row.addonAmount !== null && row.addonAmount < 0) errors.push('Addon Amount cannot be negative');
    if (row.discount !== null && row.discount < 0) errors.push('Discount cannot be negative');

    if (row.mealPlan && !VALID_MEAL_PLAN.includes(row.mealPlan as MealPlan)) {
      errors.push(`Meal Plan must be EP or CP (got "${row.mealPlan}")`);
    }

    let paymentModeId: string | null = null;
    if (!row.paymentMode) {
      errors.push('Payment Mode is required');
    } else {
      paymentModeId = paymentModesByName.get(row.paymentMode.trim().toLowerCase()) || null;
      if (!paymentModeId) {
        errors.push(`Payment Mode "${row.paymentMode}" is not a recognized mode`);
      }
    }

    if (row.amountPaid === null || row.amountPaid < 0) errors.push('Amount Paid is required (use 0 if fully pending)');
    if (row.paymentDate && !DATE_RE.test(row.paymentDate)) errors.push(`Payment Date must be YYYY-MM-DD (got "${row.paymentDate}")`);

    const total = row.tariff !== null
      ? row.tariff + (row.gst || 0) + (row.addonAmount || 0) + (row.mealPlanAmount || 0) + (row.mealPlanGst || 0) - (row.discount || 0)
      : null;

    return { ...row, errors, roomId, paymentModeId, nights, total };
  });
}
