'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { themes } from '@/lib/themes';

// --- ESTRUCTURA DE DATOS PARA SORTEOS ---
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
// ----------------------------------------

interface BusinessContextType {
  businessName: string;
  businessLogo: string;
  theme: string;
  sorteos: Sorteo[]; // Añadido para sorteos
  isLoading: boolean;
  setBusinessName: (name: string) => void;
  setBusinessLogo: (logo: string) => void;
  setTheme: (themeName: string) => void;
  resetBusinessInfo: () => void;
}

const DEFAULT_NAME = "LottoSalesHub";
const DEFAULT_LOGO_ID = 'default';
const DEFAULT_THEME_NAME = themes[0].name;

// --- DATOS DE EJEMPLO PARA SORTEOS ---
const DEFAULT_SORTEOS: Sorteo[] = [
  {
    id: 'loteria_nacional',
    name: 'Lotería Nacional',
    digits: 2,
    horarios: [
      { id: 'tarde', name: 'Tarde' },
      { id: 'noche', name: 'Noche' },
    ],
  },
  {
    id: 'pale',
    name: 'Palé',
    digits: 2,
    horarios: [{ id: 'unica', name: 'Única' }],
  },
  {
    id: 'quiniela_real',
    name: 'Quiniela Real',
    digits: 2,
    horarios: [{ id: 'mediodia', name: 'Mediodía' }],
  },
];
// -------------------------------------

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [businessName, setBusinessNameState] = useState<string>(DEFAULT_NAME);
  const [businessLogo, setBusinessLogoState] = useState<string>(DEFAULT_LOGO_ID);
  const [theme, setThemeState] = useState<string>(DEFAULT_THEME_NAME);
  const [sorteos, setSorteos] = useState<Sorteo[]>(DEFAULT_SORTEOS); // Estado para sorteos
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedName = localStorage.getItem('businessName');
      if (savedName) setBusinessNameState(savedName);

      const savedLogo = localStorage.getItem('businessLogo');
      if (savedLogo) setBusinessLogoState(savedLogo);

      const savedTheme = localStorage.getItem('businessTheme');
      if (savedTheme) setThemeState(savedTheme);

      // Aquí podrías cargar los sorteos desde localStorage también
      // const savedSorteos = localStorage.getItem('businessSorteos');
      // if (savedSorteos) setSorteos(JSON.parse(savedSorteos));

    } catch (error) {
      console.error("Could not access localStorage. Using default info.", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSetBusinessName = (name: string) => {
    setBusinessNameState(name);
    localStorage.setItem('businessName', name);
  };

  const handleSetBusinessLogo = (logoUrl: string) => {
    setBusinessLogoState(logoUrl);
    localStorage.setItem('businessLogo', logoUrl);
  };

  const handleSetTheme = (themeName: string) => {
    setThemeState(themeName);
    localStorage.setItem('businessTheme', themeName);
  };
  
  const handleReset = () => {
    setBusinessNameState(DEFAULT_NAME);
    setBusinessLogoState(DEFAULT_LOGO_ID);
    setThemeState(DEFAULT_THEME_NAME);
    setSorteos(DEFAULT_SORTEOS); // Resetear a datos por defecto
    localStorage.removeItem('businessName');
    localStorage.removeItem('businessLogo');
    localStorage.removeItem('businessTheme');
    // localStorage.removeItem('businessSorteos');
  };

  const value = {
    businessName,
    businessLogo,
    theme,
    sorteos, // Exportar sorteos
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

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
