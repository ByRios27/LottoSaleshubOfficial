// src/lib/firebase/admin.ts
import 'server-only';
import { cert, getApps, getApp, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Lee las credenciales directamente, SIN intentar modificarlas.
const projectId   = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey  = process.env.FIREBASE_PRIVATE_KEY;

// Si alguna de las claves falta, lanza un error claro.
if (!projectId || !clientEmail || !privateKey) {
  throw new Error('Faltan FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY en .env.local. Asegúrate de que el archivo existe y las variables están definidas.');
}

const credentials = {
  projectId,
  clientEmail,
  privateKey,
} as ServiceAccount;

const app = getApps().length
  ? getApp()
  : initializeApp({ credential: cert(credentials) });

export const adminDb = getFirestore(app);
