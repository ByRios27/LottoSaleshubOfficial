// src/lib/firebase/admin.ts
import 'server-only';
import { cert, getApps, getApp, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId   = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\n/g, '\n');

// Evita el error "undefined is not valid JSON"
if (!projectId || !clientEmail || !privateKey) {
throw new Error('Faltan FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY');
}

const app = getApps().length
? getApp()
: initializeApp({
    credential: cert({ projectId, clientEmail, privateKey } as ServiceAccount),
  });

export const adminDb = getFirestore(app);
