import { useQuery } from '@tanstack/react-query';
import { PaymentModeOption } from '@/domain/lookups';

const base = { propertyId: '', createdAt: 0, createdBy: '', updatedAt: 0, updatedBy: '' };

export const HARDCODED_PAYMENT_MODES: PaymentModeOption[] = [
  { id: 'cash', name: 'Cash', active: true, sortOrder: 1, ...base },
  { id: 'upi', name: 'UPI', active: true, sortOrder: 2, ...base },
  { id: 'card', name: 'Card', active: true, sortOrder: 3, ...base },
  { id: 'bank_transfer', name: 'Bank Transfer', active: true, sortOrder: 4, ...base },
  { id: 'scanner', name: 'Scanner', active: true, sortOrder: 5, ...base },
  { id: 'ota_bank_transfer', name: 'OTA Bank Transfer', active: true, sortOrder: 6, ...base },
  { id: 'b2c', name: 'B2C', active: true, sortOrder: 7, ...base },
  { id: 'pending', name: 'Pending', active: true, sortOrder: 8, ...base },
];

export function usePaymentModes() {
  return useQuery({
    queryKey: ['paymentModes'],
    queryFn: () => HARDCODED_PAYMENT_MODES,
  });
}

