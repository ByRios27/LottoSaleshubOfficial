'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// --- Definición de Tipos ---
export type Sale = {
  ticketId: string;
  timestamp: string;
  drawId: string;
  schedules: string[];
  numbers: { number: string; quantity: number }[];
  sellerId: string;
  clientName?: string;
  clientPhone?: string;
  costPerFraction: number;
  totalCost: number;
};

type SalesContextType = {
  sales: Sale[];
  addSale: (newSale: Sale) => void;
  deleteSale: (ticketId: string) => void;
  isLoading: boolean;
};

// --- Creación del Contexto ---
const SalesContext = createContext<SalesContextType | undefined>(undefined);

// --- Hook Personalizado ---
export function useSales() {
  const context = useContext(SalesContext);
  if (context === undefined) {
    throw new Error('useSales must be used within a SalesProvider');
  }
  return context;
}

// --- Proveedor del Contexto ---
interface SalesProviderProps {
  children: ReactNode;
}

export function SalesProvider({ children }: SalesProviderProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedSales = window.localStorage.getItem('allSalesData');
      if (savedSales) {
        setSales(JSON.parse(savedSales));
      }
    } catch (error) {
      console.error("Error loading sales from localStorage", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      try {
        window.localStorage.setItem('allSalesData', JSON.stringify(sales));
      } catch (error) {
        console.error("Error saving sales to localStorage", error);
      }
    }
  }, [sales, isLoading]);

  const addSale = useCallback((newSale: Sale) => {
    setSales(prevSales => [newSale, ...prevSales]);
  }, []);

  const deleteSale = useCallback((ticketId: string) => {
    setSales(prevSales => prevSales.filter(sale => sale.ticketId !== ticketId));
  }, []);

  const value = {
    sales,
    addSale,
    deleteSale,
    isLoading
  };

  return (
    <SalesContext.Provider value={value}>
      {children}
    </SalesContext.Provider>
  );
}
