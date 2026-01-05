'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { themes } from '@/lib/themes';
import { useAuth } from './AuthContext';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';

// --- ESTRUCTURAS DE DATOS ---
export interface BusinessData {
  name?: string;
  logoUrl?: string;
  theme?: string;
}

// --- TIPOS DEL CONTEXTO ---
interface BusinessContextType {
  business: BusinessData | null;
  loading: boolean;
  setBusiness: (data: Partial<BusinessData>) => void; // Acepta datos parciales
  theme: string;
  setTheme: (themeName: string) => void;
}

// --- CREACIÓN DEL CONTEXTO ---
const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

// --- COMPONENTE PROVEEDOR ---
export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const db = getFirestore(app);

  const [business, setBusinessState] = useState<BusinessData | null>(null);
  const [theme, setThemeState] = useState<string>(themes[0].name);
  const [loading, setLoading] = useState(true);

  // Función unificada para guardar datos en Firestore en la ruta correcta
  const saveDataToFirestore = useCallback(async (userId: string, data: Partial<BusinessData>) => {
    try {
      const businessDocRef = doc(db, 'businesses', userId);
      await setDoc(businessDocRef, data, { merge: true });
    } catch (error) {
      console.error("Error saving data to Firestore:", error);
    }
  }, [db]);

  // Efecto para cargar datos cuando el usuario cambia
  useEffect(() => {
    const loadData = async () => {
      if (!user?.uid) {
        setBusinessState(null); // Limpia los datos si no hay usuario
        setThemeState(themes[0].name);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const docRef = doc(db, 'businesses', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as BusinessData;
          setBusinessState(data);
          setThemeState(data.theme || themes[0].name);
        } else {
          // Si no existe el documento, crea uno con valores por defecto
          const defaultBusiness: BusinessData = { 
            name: 'Mi Negocio',
            logoUrl: '',
            theme: themes[0].name 
          };
          setBusinessState(defaultBusiness);
          await saveDataToFirestore(user.uid, defaultBusiness);
        }
      } catch (error) {
        console.error("Error loading data from Firestore: ", error);
        // En caso de error, establece un estado por defecto para que la app no se rompa
        setBusinessState({ name: 'Mi Negocio', logoUrl: '', theme: themes[0].name });
        setThemeState(themes[0].name);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, db, saveDataToFirestore]);

  // Función para actualizar parcial o totalmente los datos del negocio
  const handleSetBusiness = (data: Partial<BusinessData>) => {
    if (!user) return;
    
    setBusinessState(prevState => {
        const updatedState = { ...(prevState || {}), ...data };
        return updatedState as BusinessData;
    });
    saveDataToFirestore(user.uid, data); // Guarda solo los datos que cambiaron
  };

  // Función para actualizar el tema
  const handleSetTheme = (themeName: string) => {
    if (!user) return;
    setThemeState(themeName);
    saveDataToFirestore(user.uid, { theme: themeName });
  };

  const value = {
    business,
    loading,
    setBusiness: handleSetBusiness,
    theme,
    setTheme: handleSetTheme,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

// --- HOOK PARA USAR EL CONTEXTO ---
export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
