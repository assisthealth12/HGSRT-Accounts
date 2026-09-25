import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { PayrollRun } from '@/domain/payroll';

export function usePayrollRuns() {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['payrollRuns', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const q = query(
        collection(db, 'payrollRuns'),
        where('propertyId', '==', propertyId)
      );

      const snapshot = await getDocs(q);
      const runs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PayrollRun[];

      return runs.sort((a, b) => (b.year - a.year) || (b.month - a.month));
    },
    enabled: !!propertyId,
  });
}
