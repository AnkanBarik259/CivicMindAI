import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "your api key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your own authentication domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your own project id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your own sturage bucket ",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "your own message sender key",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "your api key",
  firestoreDatabaseId: "your api key"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Set persistence to browserLocalPersistence so users remain logged in after page refresh
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Failed to set auth persistence:", error);
});

export const storage = getStorage(app);
