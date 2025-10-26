"use client";

import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getDatabase, Database } from "firebase/database";

// Define las variables para que TypeScript las conozca, aunque se inicialicen condicionalmente.
let app: FirebaseApp;
let auth: Auth;
let db: Database;

// Configuración de Firebase usando solo las variables de entorno del cliente
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

// --- INICIALIZACIÓN SEGURA ---
// Este bloque de código solo se ejecutará en el navegador.
if (typeof window !== "undefined") {
  // Valida que las variables de entorno existan en el cliente antes de inicializar.
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.databaseURL) {
    throw new Error("Faltan las variables de entorno de Firebase en el cliente. Asegúrate de que tu archivo .env.local esté bien configurado con el prefijo NEXT_PUBLIC_");
  }

  // Si no hay apps inicializadas, inicializa una. Si ya existe, obtén la instancia actual.
  // Esto previene errores de "Firebase App a''' already exists" en el hot-reloading del desarrollo.
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getDatabase(app);
}

// Exporta las instancias. TypeScript se quejará de que podrían no estar definidas,
// pero como el código que las usa (`page.tsx`) es también un "use client" y se ejecuta
// en el navegador, estas variables estarán disponibles.
// Usamos `@ts-ignore` para suprimir este error de compilación que es esperado en este patrón.
// @ts-ignore
export { app, auth, db };
