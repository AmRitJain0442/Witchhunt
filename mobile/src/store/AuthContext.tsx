import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import * as SecureStore from 'expo-secure-store';
import { login, register } from '../api/auth';
import { User } from '../types';

interface AuthContextValue {
  firebaseUser: FirebaseAuthTypes.User | null;
  appUser: User | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const MEMORY_KEY = 'kutumb_local_memory';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [appUser, setAppUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          const response = await login(token);
          setAppUser(response.user);
        } catch {
          // User not registered yet — that's OK
        }
      } else {
        setAppUser(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const cred = await auth().signInWithEmailAndPassword(email, password);
    const token = await cred.user.getIdToken();
    const response = await login(token);
    setAppUser(response.user);
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const cred = await auth().createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });
    const token = await cred.user.getIdToken(true);
    const response = await register(token);
    // Patch the name in immediately
    setAppUser({ ...response.user, name });
  };

  const signOut = async () => {
    await auth().signOut();
    setAppUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ firebaseUser, appUser, isLoading, signInWithEmail, signUpWithEmail, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

// ── Local memory helpers (stored on device via SecureStore) ───────────────────

export async function loadLocalMemory(): Promise<Record<string, unknown>> {
  try {
    const raw = await SecureStore.getItemAsync(MEMORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function saveLocalMemory(memory: Record<string, unknown>): Promise<void> {
  await SecureStore.setItemAsync(MEMORY_KEY, JSON.stringify(memory));
}

export async function applyMemoryPatches(
  memory: Record<string, unknown>,
  patches: Array<{ op: string; path: string; value?: unknown }>,
): Promise<Record<string, unknown>> {
  const result = { ...memory };

  for (const patch of patches) {
    const keys = patch.path.replace(/^\//, '').split('/');
    let target: Record<string, unknown> = result;

    // Navigate to the parent
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]] || typeof target[keys[i]] !== 'object') {
        target[keys[i]] = {};
      }
      target = target[keys[i]] as Record<string, unknown>;
    }

    const lastKey = keys[keys.length - 1];
    switch (patch.op) {
      case 'update':
      case 'add':
        target[lastKey] = patch.value;
        break;
      case 'remove':
        delete target[lastKey];
        break;
      case 'append_to_array':
        if (!Array.isArray(target[lastKey])) target[lastKey] = [];
        (target[lastKey] as unknown[]).push(patch.value);
        break;
      case 'merge':
        target[lastKey] = { ...(target[lastKey] as object ?? {}), ...(patch.value as object ?? {}) };
        break;
    }
  }

  return result;
}
