import { initializeApp, getApps } from 'firebase/app';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import * as FirebaseAuth from 'firebase/auth';
import {
  Auth,
  createUserWithEmailAndPassword,
  getAuth,
  initializeAuth,
  onAuthStateChanged,
  Persistence,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDs55IPDWKKqepUuRha8f-XsuEq0TRjxO8',
  authDomain: 'witchhunt-7c502.firebaseapp.com',
  projectId: 'witchhunt-7c502',
  storageBucket: 'witchhunt-7c502.firebasestorage.app',
  messagingSenderId: '650243296734',
  appId: '1:650243296734:web:b80310b57804b02ac6614f',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const { getReactNativePersistence } = FirebaseAuth as typeof FirebaseAuth & {
  getReactNativePersistence: (storage: typeof ReactNativeAsyncStorage) => Persistence;
};

let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export type FirebaseUser = User;
export { createUserWithEmailAndPassword, firebaseSignOut, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile };
