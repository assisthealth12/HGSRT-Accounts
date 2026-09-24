import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  propertyId: string | null;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setPropertyId: (propertyId: string) => void;
  setInitialized: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  propertyId: 'hotel-001', // Defaulting for MVP, normally fetched from user claims/db
  isInitialized: false,
  setUser: (user) => set({ user }),
  setPropertyId: (propertyId) => set({ propertyId }),
  setInitialized: (val) => set({ isInitialized: val }),
}));
