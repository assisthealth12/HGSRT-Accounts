import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const HEADERS: [string, number][] = [
  ['Guest Name', 22],
  ['Occupancy', 12],
  ['Room Number', 13],
  ['Check-in Date', 14],
  ['Check-out Date', 14],
  ['Tariff', 10],
  ['GST', 10],
  ['Addon Amount', 13],
  ['Meal Plan', 11],
  ['Meal Plan Amount', 16],
  ['Meal Plan GST', 13],
  ['Discount', 10],
  ['Payment Mode', 15],
  ['Amount Paid', 13],
  ['Payment Date', 13],
  ['Remarks', 25],
];

const EXAMPLE_ROWS = [
  ['MR. ANAR SINGH', 'Single', '103', '2026-09-19', '2026-09-20', 2400, 300, 0, '', '', '', 0, 'B2C', 2700, '2026-09-19', ''],
  ['ASHUTHOSH', 'Double', '303', '2026-09-25', '2026-09-26', 2800, 0, 0, '', '', '', 0, 'Pending', 0, '', 'Settle while checkout'],
];

export async function downloadImportTemplate() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Bookings Import');

  ws.columns = HEADERS.map(([header, width]) => ({ header, width }));
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } };
  ws.getRow(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  ws.getRow(1).height = 28;
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  EXAMPLE_ROWS.forEach(row => {
    const r = ws.addRow(row);
    r.font = { italic: true, color: { argb: 'FF808080' } };
  });

  const inst = wb.addWorksheet('Instructions');
  inst.getColumn(1).width = 100;
  inst.addRow(['How to fill this file']).font = { bold: true, size: 14 };
  const lines = [
    '',
    '1. Use the "Bookings Import" tab. Row 1 is the header — do not change column names or order.',
    '2. Rows 2-3 are EXAMPLE rows shown in grey italics — delete them before sending the file back.',
    '3. Guest Name, Occupancy (Single/Double/Triple), Room Number, Check-in/out Date, Tariff, Payment Mode, and Amount Paid are required. Everything else is optional — leave blank if not applicable.',
    '4. Room Number must exactly match a room already configured in Settings > Physical Rooms.',
    '5. Dates must be YYYY-MM-DD (e.g. 2026-09-19).',
    '6. Payment Mode must be one of: Cash, UPI, Card, Bank Transfer, Scanner, OTA Bank Transfer, B2C, Pending.',
    '7. One row = one guest booking. For multi-room bookings, add one row per room for now.',
    '8. Pending amount is never entered — it is always calculated automatically as Total minus Amount Paid.',
    '9. When ready, go to Bookings > Bulk Import and upload this file. You will see a full preview — nothing is saved until you confirm.',
  ];
  lines.forEach((line, i) => {
    const row = inst.addRow([line]);
    row.font = { size: 11 };
    row.alignment = { wrapText: true, vertical: 'top' };
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, 'Hotel GSR - Bulk Booking Import Template.xlsx');
}
