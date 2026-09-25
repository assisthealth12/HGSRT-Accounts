import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { Employee } from '@/domain/employee';
import { useAuthStore } from '@/store/authStore';
import { z } from 'zod';
import { employeeSchema } from '@/domain/schemas';
import { diffFields, excludeSoftDeleted } from '@/domain/audit';
import { logAudit } from '@/lib/audit';

export function useEmployees() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const queryClient = useQueryClient();

  const employeesQuery = useQuery({
    queryKey: ['employees', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const q = query(
        collection(db, 'employees'),
        where('propertyId', '==', propertyId)
      );

      const snapshot = await getDocs(q);
      const employees = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Employee[];

      return excludeSoftDeleted(employees);
    },
    enabled: !!propertyId,
  });

  // Delegates to the createEmployee Cloud Function, which provisions the
  // Firebase Auth login (when email+password+role are provided) and sets
  // the role custom claim server-side. Plain HR records with no login are
  // also created through this same function.
  const addEmployeeMutation = useMutation({
    mutationFn: async (newEmployee: z.infer<typeof employeeSchema>) => {
      if (!propertyId) throw new Error('No property ID');

      const createEmployee = httpsCallable(functions, 'createEmployee');
      const result = await createEmployee({ propertyId, employeeData: newEmployee });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', propertyId] });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, data, previous }: { id: string; data: Partial<Employee>; previous: Employee }) => {
      const docRef = doc(db, 'employees', id);
      const updateData = {
        ...data,
        updatedAt: Date.now(),
        updatedBy: user?.uid ?? 'unknown',
      };
      await updateDoc(docRef, updateData);

      if (propertyId && user) {
        const changes = diffFields(previous, { ...previous, ...updateData });
        if (changes.length > 0) {
          await logAudit({
            propertyId,
            userId: user.uid,
            userRole: role,
            action: 'edit',
            entityType: 'employee',
            entityId: id,
            changes,
          });
        }
      }

      return { id, ...updateData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', propertyId] });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employee: Employee) => {
      const docRef = doc(db, 'employees', employee.id);
      await updateDoc(docRef, {
        deletedAt: Date.now(),
        deletedBy: user?.uid ?? 'unknown',
        updatedAt: Date.now(),
        updatedBy: user?.uid ?? 'unknown',
      });

      if (propertyId && user) {
        await logAudit({
          propertyId,
          userId: user.uid,
          userRole: role,
          action: 'delete',
          entityType: 'employee',
          entityId: employee.id,
          changes: employee,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', propertyId] });
    },
  });

  return {
    employees: employeesQuery.data ?? [],
    isLoading: employeesQuery.isLoading,
    error: employeesQuery.error,
    addEmployee: addEmployeeMutation.mutateAsync,
    updateEmployee: updateEmployeeMutation.mutateAsync,
    deleteEmployee: deleteEmployeeMutation.mutateAsync,
  };
}
