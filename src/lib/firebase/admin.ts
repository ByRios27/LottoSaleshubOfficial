import { initializeApp, getApps, getApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = getApps().length
  ? getApp()
  : initializeApp({
      credential: applicationDefault(),
    });

export const adminDb = getFirestore(app);
