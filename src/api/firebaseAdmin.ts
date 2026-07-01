import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

const appletConfig: any = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "your firebase project id",
  firestoreDatabaseId: process.env.VITE_FIREBASE_DATABASE_ID || "your own data base id"
};

const initializeFirebaseAdmin = () => {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Make sure to replace escaped newlines from .env string
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("WARNING: Firebase Admin credentials are not fully set up in the environment variables.");
    // Initializing with default app if environment variables are missing but deployed to GCP
    // For local dev without credentials, this will fail if used.
    try {
      return initializeApp({
        projectId: appletConfig.projectId || process.env.VITE_FIREBASE_PROJECT_ID
      });
    } catch (e) {
      console.error("Firebase Admin initialization failed. Ensure FIREBASE_ADMIN_* environment variables are set.");
      throw e;
    }
  }

  try {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: `${projectId}.firebasestorage.app`, // Update if your default bucket is different
    });
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
    throw error;
  }
};

const adminApp = initializeFirebaseAdmin();
export const db = getFirestore(adminApp, appletConfig.firestoreDatabaseId || "(default)");
export const auth = getAuth(adminApp);
export const storage = getStorage(adminApp);
export default adminApp;
