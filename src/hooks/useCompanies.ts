import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { CompanyOption } from '@/domain/lookups';
import { excludeSoftDeleted } from '@/domain/audit';
import { logAudit } from '@/lib/audit';

export function useCompanies() {
  const propertyId = useAuthStore((state) => state.propertyId);

  return useQuery({
    queryKey: ['companies', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const q = query(collection(db, 'companies'), where('propertyId', '==', propertyId));
      const snapshot = await getDocs(q);
      const companies = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as CompanyOption[];
      return excludeSoftDeleted(companies).filter(c => c.active).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    },
    enabled: !!propertyId,
  });
}

export function useCreateCompany() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!propertyId) throw new Error('No property ID');
      const data = {
        name,
        sortOrder: 0,
        active: true,
        propertyId,
        createdAt: Date.now(),
        createdBy: user?.uid ?? 'unknown',
        updatedAt: Date.now(),
        updatedBy: user?.uid ?? 'unknown',
      };
      const docRef = await addDoc(collection(db, 'companies'), data);
      return { id: docRef.id, ...data };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies', propertyId] }),
  });
}

export function useDeleteCompany() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (company: CompanyOption) => {
      await updateDoc(doc(db, 'companies', company.id), {
        deletedAt: Date.now(),
        deletedBy: user?.uid ?? 'unknown',
      });
      if (propertyId && user) {
        await logAudit({
          propertyId,
          userId: user.uid,
          userRole: role,
          action: 'delete',
          entityType: 'company',
          entityId: company.id,
          changes: company,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies', propertyId] }),
  });
}
