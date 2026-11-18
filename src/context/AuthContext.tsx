import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { AuthContextType, SyncStatus } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function hasPotentialSupabaseAuthState(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (
      hash.includes('access_token=') ||
      hash.includes('type=recovery') ||
      search.includes('code=') ||
      search.includes('type=recovery')
    ) {
      return true;
    }
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
        return true;
      }
    }
  } catch {
    // Ignore storage access errors
  }
  return false;
}

async function getSupabaseClient() {
  const mod = await import('../services/supabase');
  return mod.supabase;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [isPasswordRecoveryOpen, setIsPasswordRecoveryOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      return hash.includes('type=recovery') || search.includes('type=recovery');
    }
    return false;
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const forceSyncRef = useRef<(() => Promise<void>) | null>(null);

  const registerForceSync = useCallback((fn: () => Promise<void>) => {
    forceSyncRef.current = fn;
  }, []);

  const forceSyncNow = useCallback(async () => {
    if (forceSyncRef.current) {
      await forceSyncRef.current();
    }
  }, []);

  const authSubRef = useRef<{ unsubscribe: () => void } | null>(null);
  const mountedRef = useRef<boolean>(true);

  const ensureSupabaseAuthInitialized = useCallback(async () => {
    const supabase = await getSupabaseClient();
    if (!authSubRef.current) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
        if (!mountedRef.current) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecoveryOpen(true);
        }
        if (!currentSession) {
          setSyncStatus('idle');
        }
        setIsAuthLoading(false);
      });
      authSubRef.current = subscription;
    }
    return supabase;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!hasPotentialSupabaseAuthState()) {
      setIsAuthLoading(false);
      return () => {
        mountedRef.current = false;
        authSubRef.current?.unsubscribe();
        authSubRef.current = null;
      };
    }

    ensureSupabaseAuthInitialized()
      .then((supabase) => supabase.auth.getSession())
      .then(({ data: { session: initialSession }, error }) => {
        if (error) {
          console.warn('Error reading initial Supabase session:', error.message);
        }
        if (mountedRef.current) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          setIsAuthLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to retrieve initial session:', err);
        if (mountedRef.current) setIsAuthLoading(false);
      });

    return () => {
      mountedRef.current = false;
      authSubRef.current?.unsubscribe();
      authSubRef.current = null;
    };
  }, [ensureSupabaseAuthInitialized]);

  const openAuthModal = useCallback(
    (mode: 'login' | 'signup' = 'login') => {
      setAuthModalMode(mode);
      setIsAuthModalOpen(true);
      void ensureSupabaseAuthInitialized();
    },
    [ensureSupabaseAuthInitialized]
  );

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const supabase = await ensureSupabaseAuthInitialized();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        return { error };
      }
      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        setIsAuthModalOpen(false);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err as Error };
    }
  }, [ensureSupabaseAuthInitialized]);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const supabase = await ensureSupabaseAuthInitialized();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) {
        return { error, unconfirmed: false };
      }
      const unconfirmed = Boolean(data.user && !data.session);
      if (data.session) {
        setUser(data.user);
        setSession(data.session);
        setIsAuthModalOpen(false);
      }
      return { error: null, unconfirmed };
    } catch (err: any) {
      return { error: err as Error, unconfirmed: false };
    }
  }, [ensureSupabaseAuthInitialized]);

  const signOut = useCallback(async () => {
    try {
      const supabase = await ensureSupabaseAuthInitialized();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setUser(null);
      setSession(null);
      setSyncStatus('idle');
    }
  }, [ensureSupabaseAuthInitialized]);

  const signInWithMagicLink = useCallback(async (email: string) => {
    try {
      const supabase = await ensureSupabaseAuthInitialized();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      return { error };
    } catch (err: any) {
      return { error: err as Error };
    }
  }, [ensureSupabaseAuthInitialized]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const supabase = await ensureSupabaseAuthInitialized();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      return { error };
    } catch (err: any) {
      return { error: err as Error };
    }
  }, [ensureSupabaseAuthInitialized]);

  const updatePassword = useCallback(async (newPassword: string) => {
    try {
      const supabase = await ensureSupabaseAuthInitialized();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (!error) {
        if (typeof window !== 'undefined' && window.location.hash?.includes('type=recovery')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        setIsPasswordRecoveryOpen(false);
      }
      return { error };
    } catch (err: any) {
      return { error: err as Error };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthLoading,
        isAuthModalOpen,
        authModalMode,
        isPasswordRecoveryOpen,
        setIsPasswordRecoveryOpen,
        syncStatus,
        lastSyncedAt,
        openAuthModal,
        closeAuthModal,
        setAuthModalMode,
        signIn,
        signUp,
        signOut,
        signInWithMagicLink,
        resetPassword,
        updatePassword,
        setSyncStatus,
        setLastSyncedAt,
        forceSyncNow,
        registerForceSync,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
