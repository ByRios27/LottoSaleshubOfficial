// src/lib/firebase/admin.ts
import 'server-only';
import { cert, getApps, getApp, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId   = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey  = process.env.FIREBASE_PRIVATE_KEY;
const isBase64 = process.env.FIREBASE_PRIVATE_KEY_IS_BASE64 === 'true';

// If the key is Base64 encoded (in production), decode it.
if (isBase64 && privateKey) {
  privateKey = Buffer.from(privateKey, 'base64').toString('utf-8');
}

// In local development, we might still be using the newline characters from the .env file.
// This ensures they are parsed correctly.
privateKey = privateKey?.replace(/\\n/g, '\n');


if (!projectId || !clientEmail || !privateKey) {
  // Construct a more helpful error message
  let missingVars = [];
  if (!projectId) missingVars.push('FIREBASE_PROJECT_ID');
  if (!clientEmail) missingVars.push('FIREBASE_CLIENT_EMAIL');
  if (!privateKey) missingVars.push('FIREBASE_PRIVATE_KEY');
  throw new Error(`Missing Firebase Admin environment variables: ${missingVars.join(', ')}. Please check your .env or hosting configuration.`);
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
