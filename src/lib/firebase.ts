// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBajXda13kUoe_zRvAr10Xutrrar7DejRo",
  authDomain: "lottosaleshub-stable-app.firebaseapp.com",
  projectId: "lottosaleshub-stable-app",
  storageBucket: "lottosaleshub-stable-app.firebasestorage.app",
  messagingSenderId: "130460716427",
  appId: "1:130460716427:web:b201f9b148c63381abf38e"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
