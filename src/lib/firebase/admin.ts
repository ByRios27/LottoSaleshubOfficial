// src/lib/firebase/admin.ts
import 'server-only';
import { Buffer } from 'node:buffer'; // <-- AÑADIDO: Importación explícita para claridad
import { cert, getApps, getApp, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId   = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey  = process.env.FIREBASE_PRIVATE_KEY;
const isBase64 = process.env.FIREBASE_PRIVATE_KEY_IS_BASE64 === 'true';

// Si la clave está en Base64 (en producción), la decodificamos.
if (isBase64 && privateKey) {
  privateKey = Buffer.from(privateKey, 'base64').toString('utf-8');
}

// Para el desarrollo local, nos aseguramos de que los saltos de línea (\n) del archivo .env se interpreten correctamente.
privateKey = privateKey?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  let missingVars = [];
  if (!projectId) missingVars.push('FIREBASE_PROJECT_ID');
  if (!clientEmail) missingVars.push('FIREBASE_CLIENT_EMAIL');
  if (!privateKey) missingVars.push('FIREBASE_PRIVATE_KEY');
  throw new Error(`Faltan variables de entorno de Firebase Admin: ${missingVars.join(', ')}. Revisa la configuración.`);
}

const serviceAccount: ServiceAccount = {
  projectId,
  clientEmail,
  privateKey,
};

const app = getApps().length
? getApp()
: initializeApp({
    credential: cert(serviceAccount),
  });

export const adminDb = getFirestore(app);
