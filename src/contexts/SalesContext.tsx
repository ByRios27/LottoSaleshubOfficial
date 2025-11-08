'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { createSaleWithIndex } from '@/app/(dashboard)/sales/actions'; // <- IMPORTAR SERVER ACTION
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  Timestamp, // Mantener Timestamp para el tipo Sale
} from 'firebase/firestore';

// --- Definición de Tipos ---
// El tipo Sale ahora puede tener un timestamp que es un string (desde el servidor)
export type Sale = {
  id?: string;
  ticketId: string;
  timestamp: Timestamp | string; // Acepta Timestamp del cliente o string del servidor
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
  addSale: (newSale: Omit<Sale, 'id' | 'timestamp'>) => Promise<void>; // Ajustado para no requerir timestamp
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

  useEffect(() => {
    if (user) {
      const fetchSales = async () => {
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
              // Convertir Timestamp a string para consistencia
              timestamp: (data.timestamp as Timestamp)?.toDate?.().toISOString() ?? data.timestamp,
            } as Sale;
          });
          setSales(userSales);
        } catch (error) {
          console.error("Error fetching sales from Firestore:", error);
        }
        setIsLoading(false);
      };
      fetchSales();
    } else {
      setSales([]);
      setIsLoading(false);
    }
  }, [user]);

  const addSale = async (newSale: Omit<Sale, 'id' | 'timestamp'>) => {
    if (!user) throw new Error('User not authenticated to add sale');

    // Actualización optimista: Añadir la venta al estado local inmediatamente
    const optimisticSale: Sale = {
      ...newSale,
      id: `temp-${Date.now()}`,
      timestamp: new Date().toISOString(), // Usar un timestamp local temporal
    };
    setSales(prevSales => [optimisticSale, ...prevSales]);

    try {
      // Llamar a la Server Action para la persistencia real
      const { saleId } = await createSaleWithIndex(user.uid, newSale as any);

      // Actualizar el estado con el ID real devuelto por el servidor
      setSales(prevSales =>
        prevSales.map(sale =>
          sale.id === optimisticSale.id ? { ...sale, id: saleId } : sale
        )
      );
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
      // Aquí también deberíamos eliminar del índice, pero es más complejo (requiere otra Server Action).
      // Por ahora, se deja como está según las instrucciones.
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
