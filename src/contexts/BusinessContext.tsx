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
  // Añade aquí otros campos que necesites
}

// --- TIPOS DEL CONTEXTO ---
interface BusinessContextType {
  business: BusinessData | null;
  loading: boolean;
  setBusiness: (data: BusinessData) => void;
  theme: string; // Mantener el tema separado por ahora para ThemeManager
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

  const saveDataToFirestore = useCallback(async (userId: string, data: Partial<BusinessData>) => {
    try {
      const userDocRef = doc(db, 'users', userId, 'business', 'profile');
      await setDoc(userDocRef, data, { merge: true });
    } catch (error) {
      console.error("Error saving data to Firestore:", error);
    }
  }, [db]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const docRef = doc(db, 'users', user.uid, 'business', 'profile');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as BusinessData;
          setBusinessState(data);
          setThemeState(data.theme || themes[0].name);
        } else {
          // Si no existe, puedes inicializarlo con valores por defecto
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
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, db, saveDataToFirestore]);

  const handleSetBusiness = (data: BusinessData) => {
    if (!user) return;
    const updatedBusiness = { ...business, ...data };
    setBusinessState(updatedBusiness);
    saveDataToFirestore(user.uid, data); // Solo guarda los datos que cambiaron
  };

  const handleSetTheme = (themeName: string) => {
    if (!user) return;
    setThemeState(themeName);
    saveDataToFirestore(user.uid, { theme: themeName });
  };

  const value = {
    business,
    loading,
    setBusiness: handleSetBusiness,
    theme, // El ThemeManager lo necesita
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
