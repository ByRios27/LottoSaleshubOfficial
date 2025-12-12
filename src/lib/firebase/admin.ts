// src/lib/firebase/admin.ts
import 'server-only';
import { cert, getApps, getApp, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId   = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

// PASO 3 (Implícito): Procesar la clave privada para que funcione en producción
const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

// PASO 2: Modificar el mensaje de error
if (!projectId || !clientEmail || !privateKey) {
  throw new Error('Faltan FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY en las variables de entorno. Verifica que estén configuradas en .env.local en desarrollo y en las Environment Variables del backend en producción.');
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
