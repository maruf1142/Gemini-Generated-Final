import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAEN-cMERBsn4vOFM7177YfW7DGS-efkLo",
  authDomain: "gen-lang-client-0254953177.firebaseapp.com",
  projectId: "gen-lang-client-0254953177",
  storageBucket: "gen-lang-client-0254953177.firebasestorage.app",
  messagingSenderId: "189255720844",
  appId: "1:189255720844:web:eb92c141b5ff4f941200a9"
};

const customDatabaseId = "ai-studio-restaurantmanage-1e2bc98e-f538-4759-8356-8a42b481a86d";

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom database ID
const db = getFirestore(app, customDatabaseId);

export { app, db };
