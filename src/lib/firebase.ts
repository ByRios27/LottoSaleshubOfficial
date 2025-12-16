import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

let firebaseConfig;

// On the server (during build or in a server component), FIREBASE_WEBAPP_CONFIG is available.
// It's a JSON string that needs to be parsed.
if (process.env.FIREBASE_WEBAPP_CONFIG) {
  const parsed = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
  firebaseConfig = {
    ...parsed,
    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      parsed.storageBucket ||
      "new-proyect-lotto-hub.firebasestorage.app",
  };
  // Si el parsed venía con appspot.com, lo corregimos sí o sí:
  if (
    typeof firebaseConfig.storageBucket === "string" &&
    firebaseConfig.storageBucket.includes("appspot.com")
  ) {
    firebaseConfig.storageBucket = "new-proyect-lotto-hub.firebasestorage.app";
  }
} else {
  // For local development, it falls back to the .env.local variables.
  // This also works for client-side code in the browser.
  firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
