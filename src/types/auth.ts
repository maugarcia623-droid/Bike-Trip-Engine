import { User, Session } from '@supabase/supabase-js';
import { TripProfile } from './trip';
import { RiderBikeSpecs } from './specs';

export type SyncStatus = 'idle' | 'loading' | 'saving' | 'synced' | 'error';

export interface AppDataPayload {
  trips: TripProfile[];
  riderSpecs: RiderBikeSpecs;
  activeTripId: string;
  updatedAt?: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup';
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: 'login' | 'signup') => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; unconfirmed?: boolean }>;
  signOut: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  isPasswordRecoveryOpen: boolean;
  setIsPasswordRecoveryOpen: (open: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setLastSyncedAt: (date: Date | null) => void;
  forceSyncNow: () => Promise<void>;
  registerForceSync: (fn: () => Promise<void>) => void;
}
