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
  ['Company', 20],
];

const HEADER_NOTES: Record<string, string> = {
  'Occupancy': 'Single, Double, or Triple only (not case-sensitive).',
  'Room Number': 'Must match a room already set up in Settings > Physical Rooms. Do NOT add a Room Type column — the room\'s type is looked up automatically from this number.',
  'Tariff': 'TOTAL for the whole stay, not per night. E.g. 3 nights at Rs.1500/night = 4500, not 1500.',
  'Addon Amount': 'TOTAL for the whole stay, not per night.',
  'Meal Plan': 'EP (room only), CP (+breakfast), or MAP (+breakfast+dinner). Leave blank for EP.',
  'Meal Plan Amount': 'TOTAL for the whole stay, not per night.',
  'Payment Mode': 'Cash, UPI, Card, Bank Transfer, Scanner, OTA Bank Transfer, B2C, or Pending.',
  'Amount Paid': 'How much has actually been received so far. Use 0 if fully pending.',
  'Company': 'Optional. Must exactly match a company already added in Settings > System Lists > Companies.',
};

const EXAMPLE_ROWS = [
  ['MR. ANAR SINGH', 'Single', '103', '2026-09-19', '2026-09-20', 2400, 300, 0, 'CP', 300, '', 0, 'B2C', 2700, '2026-09-19', '', ''],
  ['ASHUTHOSH', 'Double', '303', '2026-09-25', '2026-09-26', 2800, 0, 0, '', '', '', 0, 'Pending', 0, '', 'Settle while checkout', 'ABC Travels'],
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

  HEADERS.forEach(([header], index) => {
    const note = HEADER_NOTES[header];
    if (note) {
      ws.getCell(1, index + 1).note = note;
    }
  });

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
    '',
    'REQUIRED for every row: Guest Name, Occupancy, Room Number, Check-in Date, Check-out Date, Tariff, Payment Mode, Amount Paid.',
    'Everything else (GST, Addon Amount, Meal Plan + its Amount/GST, Discount, Payment Date, Remarks, Company) is optional — leave blank if not applicable.',
    '',
    '3. Do NOT add a Room Type column. Room Type is looked up automatically from Room Number — every physical room already has a type assigned in Settings > Physical Rooms, so it\'s never entered here. If you put a room number that doesn\'t exist in Settings yet, that row will be flagged and skipped until you either fix the number or add that room in Settings first.',
    '4. Room Number must match a room already configured in Settings > Physical Rooms (not case-sensitive, e.g. "103" or "G103" exactly as it appears there).',
    '5. Occupancy must be Single, Double, or Triple (not case-sensitive).',
    '6. Dates must be YYYY-MM-DD (e.g. 2026-09-19). Check-out must be after Check-in.',
    '7. Tariff, Addon Amount, and Meal Plan Amount are each the TOTAL for the whole stay, not a per-night rate — e.g. a 3-night stay at ₹1500/night is entered as Tariff = 4500, not 1500. This matches how the app itself stores these fields.',
    '8. Payment Mode must be one of: Cash, UPI, Card, Bank Transfer, Scanner, OTA Bank Transfer, B2C, Pending (not case-sensitive).',
    '9. Meal Plan, if used, must be EP (room only), CP (room + breakfast), or MAP (room + breakfast + dinner) — not case-sensitive. Leave blank for EP/no meal plan.',
    '10. Company is optional. If filled, it must exactly match a company already added in Settings > System Lists > Companies — add it there first if it doesn\'t exist yet.',
    '11. Pending amount is never entered — it is always calculated automatically as Total minus Amount Paid.',
    '12. If a guest paid part Cash and part UPI/another mode, enter the combined total in Amount Paid with whichever mode was larger, then record the second payment separately in the app afterward (Bookings > Payments) so both modes are tracked individually — don\'t add two rows for one stay, that creates two separate bookings for the same room.',
    '13. One row = one guest booking. For a multi-room booking (one guest, several rooms), add one row per room for now.',
    '14. Safe to re-run: if you upload the same file twice (or it was interrupted partway), rows that already exist (same guest + room + check-in date) are automatically detected and skipped — they won\'t be imported twice.',
    '15. When ready, go to Bookings > Bulk Import and upload this file. You will see a full preview — row by row, with a clear reason for anything that needs fixing — and nothing is saved until you confirm.',
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
