import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Booking, bookingTotal } from '@/domain/booking';
import { RestaurantDailySale } from '@/domain/restaurantDailySales';
import { BanquetBooking } from '@/domain/banquetBooking';
import { Expense } from '@/domain/expense';
import { StaffMember } from '@/domain/staff';
import { PayrollPayment } from '@/domain/payrollPayment';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { AttendanceRecord, getAttendanceStatus } from '@/domain/attendance';

interface ExportData {
  from: string;
  to: string;
  summary: {
    roomRevenue: number;
    roomCollected: number;
    roomPending: number;
    restaurantSalesTotal: number;
    restaurantCollectedTotal: number;
    restaurantPending: number;
    banquetSalesTotal: number;
    banquetCollectedTotal: number;
    totalGrossRevenue: number;
    totalCollected: number;
    totalExpenditure: number;
    netProfit: number;
  };
  bookings: Booking[];
  restaurantSales: RestaurantDailySale[];
  banquetSales: BanquetBooking[];
  expenses: Expense[];
  staff: StaffMember[];
  payrollPayments: PayrollPayment[];
}

export async function exportDashboardToExcel(data: ExportData) {
  const propertyId = useAuthStore.getState().propertyId;
  if (!propertyId) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hotel GSR';
  workbook.created = new Date();

  // --- SHEET 1: SUMMARY ---
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Amount (INR)', key: 'amount', width: 20 }
  ];
  summarySheet.getRow(1).font = { bold: true };
  
  summarySheet.addRows([
    { metric: 'Report Period', amount: `${data.from} to ${data.to}` },
    { metric: '' },
    { metric: '--- REVENUE ---' },
    { metric: 'Room Revenue', amount: data.summary.roomRevenue },
    { metric: 'Restaurant Sales', amount: data.summary.restaurantSalesTotal },
    { metric: 'Banquet Sales', amount: data.summary.banquetSalesTotal },
    { metric: 'TOTAL GROSS REVENUE', amount: data.summary.totalGrossRevenue },
    { metric: '' },
    { metric: '--- COLLECTIONS ---' },
    { metric: 'Room Collected', amount: data.summary.roomCollected },
    { metric: 'Restaurant Collected', amount: data.summary.restaurantCollectedTotal },
    { metric: 'Banquet Collected', amount: data.summary.banquetCollectedTotal },
    { metric: 'TOTAL COLLECTED', amount: data.summary.totalCollected },
    { metric: '' },
    { metric: '--- PENDING DUES ---' },
    { metric: 'Room Pending', amount: data.summary.roomPending },
    { metric: 'Restaurant Pending', amount: data.summary.restaurantPending },
    { metric: 'TOTAL PENDING', amount: data.summary.roomPending + data.summary.restaurantPending },
    { metric: '' },
    { metric: '--- EXPENDITURE & PROFIT ---' },
    { metric: 'Total Expenditure (Incl. Payroll)', amount: data.summary.totalExpenditure },
    { metric: 'NET PROFIT', amount: data.summary.netProfit },
  ]);

  // Make headers bold
  summarySheet.eachRow((row) => {
    if (row.values[1]?.toString().startsWith('---') || row.values[1]?.toString().includes('TOTAL')) {
      row.font = { bold: true };
    }
  });

  // --- SHEET 2: ROOMS ---
  const roomsSheet = workbook.addWorksheet('Room Bookings');
  roomsSheet.columns = [
    { header: 'Guest Name', key: 'guestName', width: 25 },
    { header: 'Check In', key: 'checkIn', width: 15 },
    { header: 'Check Out', key: 'checkOut', width: 15 },
    { header: 'Room Type', key: 'roomTypeId', width: 20 },
    { header: 'Base Rate', key: 'baseRate', width: 15 },
    { header: 'Total Value', key: 'total', width: 15 },
  ];
  roomsSheet.getRow(1).font = { bold: true };
  data.bookings.forEach(b => {
    roomsSheet.addRow({
      guestName: b.guestName,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      roomTypeId: b.roomTypeId, // Idealy resolved to name
      baseRate: b.baseRate,
      total: bookingTotal(b)
    });
  });

  // --- SHEET 3: RESTAURANT ---
  const restSheet = workbook.addWorksheet('Restaurant Sales');
  restSheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Cash Sales', key: 'cash', width: 15 },
    { header: 'Online Sales', key: 'online', width: 15 },
    { header: 'Pending Bills', key: 'pending', width: 15 },
    { header: 'Total Booked', key: 'total', width: 15 },
  ];
  restSheet.getRow(1).font = { bold: true };
  data.restaurantSales.forEach(s => {
    restSheet.addRow({
      date: s.saleDate,
      cash: s.cashAmount,
      online: s.onlineAmount,
      pending: s.pendingAmount,
      total: s.cashAmount + s.onlineAmount + s.pendingAmount
    });
  });

  // --- SHEET 4: BANQUET ---
  const banquetSheet = workbook.addWorksheet('Banquet Sales');
  banquetSheet.columns = [
    { header: 'Client Name', key: 'client', width: 25 },
    { header: 'Event Date', key: 'date', width: 15 },
    { header: 'Cash Amount', key: 'cash', width: 15 },
    { header: 'Online Amount', key: 'online', width: 15 },
    { header: 'Total Value', key: 'total', width: 15 },
  ];
  banquetSheet.getRow(1).font = { bold: true };
  data.banquetSales.forEach(s => {
    banquetSheet.addRow({
      client: s.clientName,
      date: s.eventDate,
      cash: s.cashAmount,
      online: s.onlineAmount,
      total: s.cashAmount + s.onlineAmount
    });
  });

  // --- SHEET 5: EXPENSES ---
  const expSheet = workbook.addWorksheet('Expenses');
  expSheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Bill No', key: 'billNo', width: 15 },
    { header: 'Vendor', key: 'vendor', width: 20 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Paid Via', key: 'paidVia', width: 15 },
  ];
  expSheet.getRow(1).font = { bold: true };
  data.expenses.forEach(e => {
    expSheet.addRow({
      date: e.paidOn,
      category: e.categoryId, // Ideally resolved
      billNo: e.billNo,
      vendor: e.vendorName,
      amount: e.billAmount,
      paidVia: e.paymentModeId
    });
  });

  // --- SHEET 6: PAYROLL ---
  const payrollSheet = workbook.addWorksheet('Payroll Payments');
  payrollSheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Staff Member', key: 'staff', width: 25 },
    { header: 'Amount Paid', key: 'amount', width: 15 },
    { header: 'Payment Mode', key: 'mode', width: 15 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];
  payrollSheet.getRow(1).font = { bold: true };
  
  const payrollInRange = data.payrollPayments.filter(p => p.paidOn >= data.from && p.paidOn <= data.to);
  payrollInRange.forEach(p => {
    const s = data.staff.find(x => x.id === p.staffId);
    payrollSheet.addRow({
      date: p.paidOn,
      staff: s ? s.name : 'Unknown Staff',
      amount: p.amount,
      mode: p.paymentModeId,
      notes: p.notes
    });
  });

  // --- SHEET 7: ATTENDANCE ---
  const attSheet = workbook.addWorksheet('Attendance');
  attSheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Staff Member', key: 'staff', width: 25 },
    { header: 'Role', key: 'role', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
  ];
  attSheet.getRow(1).font = { bold: true };

  // Fetch Attendance directly since Dashboard doesn't keep it
  const q = query(
    collection(db, 'attendance'),
    where('propertyId', '==', propertyId),
    where('date', '>=', data.from),
    where('date', '<=', data.to)
  );
  
  try {
    const snap = await getDocs(q);
    const records = snap.docs.map(d => d.data() as AttendanceRecord);
    
    // Sort by date, then staff name
    records.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const nameA = data.staff.find(s => s.id === a.staffId)?.name || '';
      const nameB = data.staff.find(s => s.id === b.staffId)?.name || '';
      return nameA.localeCompare(nameB);
    });

    records.forEach(r => {
      const s = data.staff.find(x => x.id === r.staffId);
      const rawStatus = getAttendanceStatus(r);
      const statusLabel = rawStatus === 'present' ? 'Present' : rawStatus === 'paid_leave' ? 'Paid Leave' : 'Absent';
      
      attSheet.addRow({
        date: r.date,
        staff: s ? s.name : 'Unknown',
        role: s ? s.role : 'Unknown',
        status: statusLabel
      });
    });
  } catch (error) {
    console.error("Failed to fetch attendance for export", error);
    attSheet.addRow({ date: 'Error loading data' });
  }

  // Write and Save
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Hotel_GSR_Report_${data.from}_to_${data.to}.xlsx`);
}
