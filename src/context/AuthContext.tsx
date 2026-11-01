import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { AuthContextType, SyncStatus } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  useEffect(() => {
    let mounted = true;

    // Check active session
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (error) {
        console.warn('Error reading initial Supabase session:', error.message);
      }
      if (mounted) {
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setIsAuthLoading(false);
      }
    }).catch((err) => {
      console.warn('Failed to retrieve initial session:', err);
      if (mounted) setIsAuthLoading(false);
    });

    // Listen for auth state changes (sign in, sign out, token refresh, password recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted) return;
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

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const openAuthModal = useCallback((mode: 'login' | 'signup' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
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
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
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
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setUser(null);
      setSession(null);
      setSyncStatus('idle');
    }
  }, []);

  const signInWithMagicLink = useCallback(async (email: string) => {
    try {
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
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      return { error };
    } catch (err: any) {
      return { error: err as Error };
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    try {
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
