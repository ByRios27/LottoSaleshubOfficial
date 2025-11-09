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
  addSale: (newSale: Omit<Sale, 'id' | 'timestamp'>) => Promise<void>;
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
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Extraer la lógica de fetching a una función `useCallback` para estabilidad
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

  // 2. El useEffect ahora solo llama a fetchSales cuando el usuario cambia.
  useEffect(() => {
    if (user) {
      fetchSales();
    } else {
      setSales([]);
      setIsLoading(false);
    }
  }, [user, fetchSales]);

  const addSale = async (newSale: Omit<Sale, 'id' | 'timestamp'>) => {
    if (!user) throw new Error('User not authenticated to add sale');
    
    const optimisticSale: Sale = {
        ...newSale,
        id: `temp-${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
  
    // Actualización optimista para la UI inmediata
    setSales(prevSales => [optimisticSale, ...prevSales]);

    try {
      // Llamada a la server action para la persistencia real
      await createSaleWithIndex(user.uid, newSale as any);
      
      // 3. Después de que la venta se guarda con éxito, se vuelven a cargar todas las ventas.
      // Esto asegura que el estado local es un reflejo exacto de la base de datos.
      await fetchSales(); 

    } catch (error) {
      console.error('Error creating sale with index:', error);
      // Revertir la actualización optimista en caso de error
      setSales(prevSales => prevSales.filter(sale => sale.id !== optimisticSale.id));
    }
  };

  const deleteSale = async (id: string) => {
    if (!user) throw new Error('User not authenticated to delete sale');
    const originalSales = [...sales];
    setSales(prevSales => prevSales.filter(sale => sale.id !== id));
    try {
      const saleDocRef = doc(db, 'users', user.uid, 'sales', id);
      await deleteDoc(saleDocRef);
      // Opcional: podrías llamar a fetchSales() aquí también si fuera necesario.
    } catch (error) {
      console.error('Error deleting sale:', error);
      setSales(originalSales); // Revertir en caso de error
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
