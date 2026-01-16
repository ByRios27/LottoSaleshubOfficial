'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useMasterData } from './MasterDataContext';

// --- Types and Context Definition ---
type ClosedSchedulesContextType = {
  closedSchedules: string[];
  isLoading: boolean;
};

const ClosedSchedulesContext = createContext<ClosedSchedulesContextType | undefined>(undefined);

export function useClosedSchedules() {
  const context = useContext(ClosedSchedulesContext);
  if (context === undefined) {
    throw new Error('useClosedSchedules must be used within a ClosedSchedulesProvider');
  }
  return context;
}

// --- Context Provider (Refactorizado) ---
export function ClosedSchedulesProvider({ children }: { children: ReactNode }) {
  // Obtenemos los datos directamente del MasterDataProvider
  const { masterData, isLoading } = useMasterData();

  // El valor del contexto ahora es simplemente un reflejo de los datos maestros
  const value = {
    closedSchedules: masterData.closedSchedules,
    isLoading: isLoading, // El estado de carga es el del maestro
  };

  return (
    <ClosedSchedulesContext.Provider value={value}>
      {children}
    </ClosedSchedulesContext.Provider>
  );
}
