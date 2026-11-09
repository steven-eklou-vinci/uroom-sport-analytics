import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { signInWithEmailAndPassword } from 'firebase/auth';

import { setAuthToken, webRequest } from '../api/client';
import { getFirebaseAuth } from '../lib/firebase/client';
import type { AuthSession, AuthUser } from '../types';

const STORAGE_KEY = 'uroom.auth.session';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  session: AuthSession | null;
  status: AuthStatus;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

type LoginResponse = {
  token: string;
  user: AuthUser;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!stored) {
          if (isMounted) {
            setStatus('unauthenticated');
          }
          return;
        }
        const parsed = JSON.parse(stored) as AuthSession;
        if (isMounted) {
          setSession(parsed);
          setAuthToken(parsed.token);
          setStatus('authenticated');
        }
      } catch (error) {
        console.warn('Failed to restore session.', error);
        if (isMounted) {
          setStatus('unauthenticated');
        }
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    let result: LoginResponse | null = null;

    try {
      const auth = getFirebaseAuth();
      const firebaseUser = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await firebaseUser.user.getIdToken();
      result = await webRequest<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ idToken })
      });
    } catch (error) {
      // Legacy fallback for accounts not yet in Firebase.
      result = await webRequest<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
    }

    if (!result) {
      throw new Error('Login failed');
    }
    const nextSession: AuthSession = {
      token: result.token,
      user: result.user
    };
    setSession(nextSession);
    setAuthToken(result.token);
    setStatus('authenticated');
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
  };

  const signOut = async () => {
    setSession(null);
    setAuthToken(null);
    setStatus('unauthenticated');
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo<AuthContextValue>(() => ({
    session,
    status,
    signIn,
    signOut
  }), [session, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
