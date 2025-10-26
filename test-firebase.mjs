
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import admin from 'firebase-admin';

// Manually construct the service account object from environment variables
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://lottosaleshub-stable-app-default-rtdb.firebaseio.com`
  });

  const db = admin.database();
  const ref = db.ref('test-connection');

  await ref.once('value');
  console.log('✅ Firebase Admin SDK connection successful!');
  process.exit(0);
} catch (error) {
  console.error('❌ Firebase Admin SDK connection failed:', error.message);
  process.exit(1);
}
