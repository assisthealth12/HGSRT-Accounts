import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from '../router';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuthStore } from '@/store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export function AppProvider() {
  const { setUser, setInitialized, setRole, setPropertyId } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        try {
          // Force refresh to get latest claims (like role) immediately
          const tokenResult = await user.getIdTokenResult(true);
          setRole((tokenResult.claims.role as any) ?? null);
          setPropertyId((tokenResult.claims.propertyId as string) ?? null);
        } catch (error) {
          console.error('Error fetching token claims:', error);
          setRole(null);
          setPropertyId(null);
        }
      } else {
        setRole(null);
        setPropertyId(null);
      }

      setInitialized(true);
    });

    return () => unsubscribe();
  }, [setUser, setInitialized, setRole, setPropertyId]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
