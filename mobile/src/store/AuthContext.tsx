import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { login, register } from '../api/auth';
import { User } from '../types';
import {
  auth,
  createUserWithEmailAndPassword,
  FirebaseUser,
  firebaseSignOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  updateProfile,
} from '../lib/firebase';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  appUser: User | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const MEMORY_KEY = 'kutumb_local_memory';

function defaultMemory(): Record<string, unknown> {
  return {
    _meta: {
      schema_version: '1.0.0',
      patch_sequence: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      storage: 'expo-secure-store',
    },
    identity: {},
    family_links: [],
    conditions: [],
    medicines: [],
    allergies: [],
    symptom_log: [],
    lab_history: [],
    organ_scores: { heart: 50, brain: 50, gut: 50, lungs: 50, history: [] },
    voice_baseline: {},
    trigger_rules: [],
    audit_log: [],
    session_memory: { last_10_sessions: [], compressed_history: { version: 1, summary: '' } },
  };
}

type PathSegment = string | { key: string; id: string };

function parsePath(path: string): PathSegment[] {
  const normalized = path.startsWith('/') ? path.slice(1).replace(/\//g, '.') : path;
  return normalized.split('.').filter(Boolean).map((part) => {
    const match = part.match(/^([^\[]+)\[id=([^\]]+)\]$/);
    return match ? { key: match[1], id: match[2] } : part;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneMemory(memory: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(memory || {})) as Record<string, unknown>;
}

function resolveParent(root: Record<string, unknown>, path: string) {
  const segments = parsePath(path);
  let target: Record<string, unknown> = root;
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    if (typeof segment === 'string') {
      if (!isRecord(target[segment])) target[segment] = {};
      target = target[segment] as Record<string, unknown>;
      continue;
    }
    if (!Array.isArray(target[segment.key])) target[segment.key] = [];
    const array = target[segment.key] as Record<string, unknown>[];
    let item = array.find((entry) => entry.id === segment.id);
    if (!item) {
      item = { id: segment.id };
      array.push(item);
    }
    target = item;
  }
  return { target, last: segments[segments.length - 1] };
}

function readValue(root: Record<string, unknown>, path: string): unknown {
  const segments = parsePath(path);
  let target: unknown = root;
  for (const segment of segments) {
    if (!isRecord(target)) return undefined;
    if (typeof segment === 'string') {
      target = target[segment];
    } else {
      const array = target[segment.key];
      target = Array.isArray(array) ? array.find((entry) => isRecord(entry) && entry.id === segment.id) : undefined;
    }
  }
  return target;
}

function writeValue(root: Record<string, unknown>, path: string, value: unknown, merge = false) {
  const { target, last } = resolveParent(root, path);
  if (typeof last !== 'string') {
    if (!Array.isArray(target[last.key])) target[last.key] = [];
    const array = target[last.key] as Record<string, unknown>[];
    const idx = array.findIndex((entry) => entry.id === last.id);
    const nextValue = isRecord(value) ? { id: last.id, ...value } : { id: last.id, value };
    if (idx >= 0) array[idx] = merge && isRecord(array[idx]) && isRecord(value) ? { ...array[idx], ...value } : nextValue;
    else array.push(nextValue);
    return;
  }
  target[last] = merge && isRecord(target[last]) && isRecord(value)
    ? { ...(target[last] as Record<string, unknown>), ...value }
    : value;
}

function removeValue(root: Record<string, unknown>, path: string) {
  const { target, last } = resolveParent(root, path);
  if (typeof last === 'string') {
    delete target[last];
    return;
  }
  const array = target[last.key];
  if (Array.isArray(array)) {
    target[last.key] = array.filter((entry) => !isRecord(entry) || entry.id !== last.id);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
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
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const token = await cred.user.getIdToken();
    const response = await login(token);
    setAppUser(response.user);
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    const token = await cred.user.getIdToken(true);
    const response = await register(token, undefined, name);
    // Patch the name in immediately
    setAppUser({ ...response.user, name });
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
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
    return raw ? { ...defaultMemory(), ...JSON.parse(raw) } : defaultMemory();
  } catch {
    return defaultMemory();
  }
}

export async function saveLocalMemory(memory: Record<string, unknown>): Promise<void> {
  const next = {
    ...memory,
    _meta: {
      ...((memory._meta as Record<string, unknown>) ?? {}),
      updated_at: new Date().toISOString(),
      storage: 'expo-secure-store',
    },
  };
  await SecureStore.setItemAsync(MEMORY_KEY, JSON.stringify(next));
}

export async function applyMemoryPatches(
  memory: Record<string, unknown>,
  patches: Array<{ op: string; path: string; value?: unknown }>,
): Promise<Record<string, unknown>> {
  const result = cloneMemory({ ...defaultMemory(), ...memory });

  for (const patch of patches) {
    switch (patch.op) {
      case 'update':
      case 'add':
        writeValue(result, patch.path, patch.value);
        break;
      case 'remove':
        removeValue(result, patch.path);
        break;
      case 'append_to_array':
      case 'prepend_to_array': {
        const current = readValue(result, patch.path);
        const array = Array.isArray(current) ? [...current] : [];
        if (patch.op === 'prepend_to_array') array.unshift(patch.value);
        else array.push(patch.value);
        writeValue(result, patch.path, array);
        break;
      }
      case 'merge':
        writeValue(result, patch.path, patch.value, true);
        break;
      case 'remove_from_array': {
        const current = readValue(result, patch.path);
        const value = patch.value as Record<string, unknown> | undefined;
        const id = value?.id;
        if (Array.isArray(current) && id) {
          writeValue(result, patch.path, current.filter((entry) => !isRecord(entry) || entry.id !== id));
        }
        break;
      }
    }
  }

  const meta = (result._meta as Record<string, unknown>) ?? {};
  result._meta = {
    ...meta,
    patch_sequence: Number(meta.patch_sequence ?? 0) + patches.length,
    updated_at: new Date().toISOString(),
  };

  return result;
}
