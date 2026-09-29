export interface BanquetBooking {
  id: string;
  propertyId: string;
  customerName: string;
  eventDate: string;
  eventType?: string;
  quotedAmount: number; // in paise
  remarks?: string;
  createdAt: string;
}

export function banquetPending(booking: BanquetBooking, payments: { amount: number }[]) {
  const received = payments.reduce((acc, p) => acc + p.amount, 0);
  return booking.quotedAmount - received;
}

export function banquetReceived(payments: { amount: number }[]) {
  return payments.reduce((acc, p) => acc + p.amount, 0);
}
