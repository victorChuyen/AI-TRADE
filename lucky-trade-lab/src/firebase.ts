/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC AI Trader / Lucky Trade OS — Firebase Client Config
 * Connected to project: opc-ai-trader
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyCbrDs10N1Qqb7kII9keLN7uEW3UzCgpxo",
  authDomain: "opc-ai-trader.firebaseapp.com",
  projectId: "opc-ai-trader",
  storageBucket: "opc-ai-trader.firebasestorage.app",
  messagingSenderId: "371100655035",
  appId: "1:371100655035:web:8fa8662a7703036872f89e",
  measurementId: "G-0CLRVZ5LVV"
};

// Initialize Firebase App Singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User
};
