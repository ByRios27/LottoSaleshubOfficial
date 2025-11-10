'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { createSaleWithIndex } from '@/app/(dashboard)/sales/actions';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';

// --- Definición de Tipos ---
export type Sale = {
  id?: string;
  ticketId: string;
  timestamp: Timestamp | string;
  drawId: string;
  drawName: string;
  drawLogo?: string;
  schedules: string[];
  numbers: { number: string; quantity: number }[];
  sellerId: string;
  clientName?: string;
  clientPhone?: string;
  costPerFraction: number;
  totalCost: number;
  receiptUrl: string;
};

type SalesContextType = {
  sales: Sale[];
  addSale: (newSale: Omit<Sale, 'id' | 'timestamp'>) => Promise<Sale | undefined>;
  deleteSale: (id: string) => Promise<void>;
  isLoading: boolean;
};

const SalesContext = createContext<SalesContextType | undefined>(undefined);

export function useSales() {
  const context = useContext(SalesContext);
  if (context === undefined) {
    throw new Error('useSales must be used within a SalesProvider');
  }
  return context;
}

interface SalesProviderProps {
  children: ReactNode;
}

export function SalesProvider({ children }: SalesProviderProps) {
  const { user, loading: isAuthLoading } = useAuth(); // CORRECCIÓN: 'loading' en lugar de 'isLoading'
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSales = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const salesCollectionRef = collection(db, 'users', user.uid, 'sales');
    const q = query(salesCollectionRef, orderBy('timestamp', 'desc'));
    try {
      const querySnapshot = await getDocs(q);
      const userSales = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: (data.timestamp as Timestamp)?.toDate?.().toISOString() ?? data.timestamp,
        } as Sale;
      });
      setSales(userSales);
    } catch (error) {
      console.error("Error fetching sales from Firestore:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (user) {
      fetchSales();
    } else {
      setSales([]);
      setIsLoading(false);
    }
  }, [user, isAuthLoading, fetchSales]);

  const addSale = async (newSale: Omit<Sale, 'id' | 'timestamp'>): Promise<Sale | undefined> => {
    if (!user) throw new Error('User not authenticated to add sale');
    
    const optimisticSale: Sale = {
        ...newSale,
        id: `temp-${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
  
    setSales(prevSales => [optimisticSale, ...prevSales]);

    try {
      const { saleId } = await createSaleWithIndex(user.uid, newSale as any);
      
      if (!saleId) {
        throw new Error('Sale creation failed, no ID returned.');
      }
      
      const finalSale: Sale = {
        ...newSale,
        id: saleId,
        timestamp: new Date().toISOString(), // Usamos la fecha actual, aunque el servidor tiene la definitiva
      };

      // Reemplazamos la venta optimista con la venta real
      setSales(prevSales => 
        prevSales.map(sale => sale.id === optimisticSale.id ? finalSale : sale)
      );
      
      return finalSale;

    } catch (error) {
      console.error('Error creating sale with index:', error);
      // Si falla, eliminamos la venta optimista
      setSales(prevSales => prevSales.filter(sale => sale.id !== optimisticSale.id));
      return undefined; // Devolvemos undefined en caso de error
    }
  };

  const deleteSale = async (id: string) => {
    if (!user) throw new Error('User not authenticated to delete sale');
    const originalSales = [...sales];
    setSales(prevSales => prevSales.filter(sale => sale.id !== id));
    try {
      const saleDocRef = doc(db, 'users', user.uid, 'sales', id);
      await deleteDoc(saleDocRef);
    } catch (error) {
      console.error('Error deleting sale:', error);
      setSales(originalSales);
    }
  };

  const value = {
    sales,
    addSale,
    deleteSale,
    isLoading,
  };

  return (
    <SalesContext.Provider value={value}>
      {children}
    </SalesContext.Provider>
  );
}
