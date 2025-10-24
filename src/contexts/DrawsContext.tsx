'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { initialDraws } from '@/lib/placeholder-data';

// --- Definición de Tipos ---
export type Draw = {
  id: string;
  name: string;
  logo?: string;
  cif: number;
  cost: number;
  sch: string[];
};

type DrawsContextType = {
  draws: Draw[];
  addDraw: (newDraw: Omit<Draw, 'id'>) => void;
  updateDraw: (updatedDraw: Draw) => void;
  deleteDraw: (id: string) => void;
};

// --- Creación del Contexto ---
const DrawsContext = createContext<DrawsContextType | undefined>(undefined);

// --- Hook Personalizado ---
export function useDraws() {
  const context = useContext(DrawsContext);
  if (context === undefined) {
    throw new Error('useDraws must be used within a DrawsProvider');
  }
  return context;
}

// --- Proveedor del Contexto con Carga Prioritaria de LocalStorage ---
interface DrawsProviderProps {
  children: ReactNode;
}

export function DrawsProvider({ children }: DrawsProviderProps) {
  // 1. Iniciar siempre con los datos de ejemplo para consistencia SSR/cliente.
  const [draws, setDraws] = useState<Draw[]>(initialDraws);

  // 2. En el primer render del cliente, cargar desde localStorage si existe.
  useEffect(() => {
    try {
      const savedDraws = window.localStorage.getItem('drawsData');
      if (savedDraws) {
        setDraws(JSON.parse(savedDraws));
      }
    } catch (error) {
      console.error("Error loading draws from localStorage on mount", error);
    }
  }, []); // El array vacío asegura que esto se ejecute solo una vez en el cliente.

  // 3. Guardar en localStorage cada vez que los sorteos cambien.
  useEffect(() => {
    // Evitar sobreescribir los datos guardados con los datos iniciales durante la carga.
    if (draws !== initialDraws) {
        try {
            window.localStorage.setItem('drawsData', JSON.stringify(draws));
        } catch (error) {
            console.error("Error saving draws to localStorage", error);
        }
    }
  }, [draws]);

  // 4. Sincronización entre pestañas (sin cambios, esto es para otras pestañas).
  const handleStorageChange = useCallback((event: StorageEvent) => {
    if (event.key === 'drawsData' && event.newValue && event.oldValue !== event.newValue) {
      try {
        setDraws(JSON.parse(event.newValue));
      } catch (error) {
        console.error("Error parsing draws from storage event", error);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [handleStorageChange]);

  // --- Funciones de Modificación (sin cambios) ---
  const addDraw = (newDrawData: Omit<Draw, 'id'>) => {
    const newDraw: Draw = { id: Date.now().toString(), ...newDrawData };
    setDraws(prevDraws => [newDraw, ...prevDraws]);
  };

  const updateDraw = (updatedDraw: Draw) => {
    setDraws(prevDraws => 
      prevDraws.map(d => (d.id === updatedDraw.id ? updatedDraw : d))
    );
  };

  const deleteDraw = (id: string) => {
    setDraws(prevDraws => prevDraws.filter(d => d.id !== id));
  };

  const value = { draws, addDraw, updateDraw, deleteDraw };

  return (
    <DrawsContext.Provider value={value}>
      {children}
    </DrawsContext.Provider>
  );
}
