'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { themes } from '@/lib/themes';
import { useAuth } from './AuthContext'; // Importar el hook de autenticación
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';

// --- ESTRUCTURAS DE DATOS ---
export interface Horario {
  id: string;
  name: string;
}

export interface Sorteo {
  id: string;
  name: string;
  digits: number;
  horarios: Horario[];
}

// --- TIPOS DEL CONTEXTO ---
interface BusinessContextType {
  businessName: string;
  businessLogo: string;
  theme: string;
  sorteos: Sorteo[];
  isLoading: boolean;
  setBusinessName: (name: string) => void;
  setBusinessLogo: (logo: string) => void;
  setTheme: (themeName: string) => void;
  resetBusinessInfo: () => void;
}

// --- VALORES POR DEFECTO ---
const DEFAULT_NAME = "LottoSalesHub";
const DEFAULT_LOGO_ID = 'default';
const DEFAULT_THEME_NAME = themes[0].name;
const DEFAULT_SORTEOS: Sorteo[] = [
  { id: 'loteria_nacional', name: 'Lotería Nacional', digits: 2, horarios: [{ id: 'tarde', name: 'Tarde' }, { id: 'noche', name: 'Noche' }] },
  { id: 'pale', name: 'Palé', digits: 2, horarios: [{ id: 'unica', name: 'Única' }] },
  { id: 'quiniela_real', name: 'Quiniela Real', digits: 2, horarios: [{ id: 'mediodia', name: 'Mediodía' }] },
];

// --- CREACIÓN DEL CONTEXTO ---
const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

// --- COMPONENTE PROVEEDOR ---
export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth(); // Obtener el usuario del contexto de autenticación
  const db = getFirestore(app);

  const [businessName, setBusinessNameState] = useState<string>(DEFAULT_NAME);
  const [businessLogo, setBusinessLogoState] = useState<string>(DEFAULT_LOGO_ID);
  const [theme, setThemeState] = useState<string>(DEFAULT_THEME_NAME);
  const [sorteos, setSorteos] = useState<Sorteo[]>(DEFAULT_SORTEOS);
  const [isLoading, setIsLoading] = useState(true);

  // --- GUARDAR DATOS EN FIRESTORE ---
  const saveDataToFirestore = useCallback(async (data: Partial<BusinessContextType>) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, data, { merge: true });
    } catch (error) {
      console.error("Error saving data to Firestore:", error);
    }
  }, [user, db]);

  // --- CARGAR DATOS DESDE FIRESTORE ---
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setBusinessNameState(data.businessName || DEFAULT_NAME);
          setBusinessLogoState(data.businessLogo || DEFAULT_LOGO_ID);
          setThemeState(data.theme || DEFAULT_THEME_NAME);
          // Si tienes sorteos guardados, cárgalos también. Por ahora usamos los por defecto.
          // setSorteos(data.sorteos || DEFAULT_SORTEOS);
        } else {
          // Si el documento no existe, inicializa con los valores por defecto
          await saveDataToFirestore({
            businessName: DEFAULT_NAME,
            businessLogo: DEFAULT_LOGO_ID,
            theme: DEFAULT_THEME_NAME,
            sorteos: DEFAULT_SORTEOS,
          });
        }
      } catch (error) {
        console.error("Error loading data from Firestore: ", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, db, saveDataToFirestore]);

  // --- HANDLERS PARA ACTUALIZAR ESTADO Y FIRESTORE ---
  const handleSetBusinessName = (name: string) => {
    setBusinessNameState(name);
    saveDataToFirestore({ businessName: name });
  };

  const handleSetBusinessLogo = (logoUrl: string) => {
    setBusinessLogoState(logoUrl);
    saveDataToFirestore({ businessLogo: logoUrl });
  };

  const handleSetTheme = (themeName: string) => {
    setThemeState(themeName);
    saveDataToFirestore({ theme: themeName });
  };

  const handleReset = () => {
    setBusinessNameState(DEFAULT_NAME);
    setBusinessLogoState(DEFAULT_LOGO_ID);
    setThemeState(DEFAULT_THEME_NAME);
    setSorteos(DEFAULT_SORTEOS);
    saveDataToFirestore({
      businessName: DEFAULT_NAME,
      businessLogo: DEFAULT_LOGO_ID,
      theme: DEFAULT_THEME_NAME,
      sorteos: DEFAULT_SORTEOS,
    });
  };

  const value = {
    businessName,
    businessLogo,
    theme,
    sorteos,
    isLoading,
    setBusinessName: handleSetBusinessName,
    setBusinessLogo: handleSetBusinessLogo,
    setTheme: handleSetTheme,
    resetBusinessInfo: handleReset,
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
