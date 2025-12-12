// src/lib/firebase/admin.ts
import 'server-only';
import { cert, getApps, getApp, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId   = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

// La clave se obtiene directamente del Secret Manager, no necesita ninguna transformación.
const privateKey  = process.env.FIREBASE_PRIVATE_KEY;

// PASO 2: Modificar el mensaje de error
if (!projectId || !clientEmail || !privateKey) {
  throw new Error('Faltan FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY. Verifica que las variables de entorno estén configuradas correctamente en App Hosting.');
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
