'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebase';
import { authApi, userApi } from './api';

interface AppUser {
  uid: string;
  name: string;
  email: string;
  date_of_birth?: string;
  family_count?: number;
  active_medicine_count?: number;
}

interface AuthCtx {
  user: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  signIn:   (email: string, pw: string) => Promise<void>;
  signUp:   (email: string, pw: string, name: string) => Promise<void>;
  signOut:  () => Promise<void>;
  refreshAppUser: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAppUser = async () => {
    try {
      const u = await userApi.me();
      setAppUser(u);
    } catch {
      setAppUser(null);
    }
  };

  useEffect(() => {
    return onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        await fetchAppUser();
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });
  }, []);

  const signIn = async (email: string, pw: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pw);
    const token = await cred.user.getIdToken();
    const res = await authApi.login(token);
    setAppUser(res.user);
  };

  const signUp = async (email: string, pw: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pw);
    await updateProfile(cred.user, { displayName: name });
    const token = await cred.user.getIdToken(true);
    const res = await authApi.register(token);
    setAppUser({ ...res.user, name });
  };

  const signOut = async () => {
    await authApi.logout().catch(() => {});
    await fbSignOut(auth);
    setUser(null);
    setAppUser(null);
  };

  return (
    <Ctx.Provider value={{ user, appUser, loading, signIn, signUp, signOut, refreshAppUser: fetchAppUser }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
