import { initializeApp, getApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Lee las credenciales de la Cuenta de Servicio desde la variable de entorno
// proporcionada por App Hosting, que contiene el JSON completo.
const serviceAccount = JSON.parse(
  process.env.SERVICE_ACCOUNT_JSON as string
);

// Inicializa el SDK de Admin, asegurándote de no hacerlo dos veces
const adminApp = !getApps().length
  ? initializeApp({
      credential: cert(serviceAccount),
    })
  : getApp();

const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

export { adminApp, adminAuth, adminDb };
