'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { createSaleWithIndex, updateSaleWithIndex } from '@/app/(dashboard)/sales/actions';
import {
  collection,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
  onSnapshot
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
  updateSale: (id: string, updatedData: Partial<Omit<Sale, 'id'>>) => Promise<void>;
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
  const { user, loading: isAuthLoading } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) {
      setIsLoading(true);
      return;
    }
    if (!user) {
      setSales([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const salesCollectionRef = collection(db, 'users', user.uid, 'sales');
    const q = query(salesCollectionRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSales(prevSales => {
        let newSales = [...prevSales];

        snapshot.docChanges().forEach((change) => {
          const docData = change.doc.data();
          const sale = {
            id: change.doc.id,
            ...docData,
            timestamp: (docData.timestamp as Timestamp)?.toDate?.().toISOString() ?? docData.timestamp,
          } as Sale;

          if (change.type === "added") {
            // Añadir si no existe, para evitar duplicados en la carga inicial
            if (!newSales.some(s => s.id === sale.id)) {
                newSales.push(sale);
            }
          }
          if (change.type === "modified") {
            const index = newSales.findIndex(s => s.id === sale.id);
            if (index !== -1) {
              newSales[index] = sale; // Actualiza el elemento existente
            }
          }
          if (change.type === "removed") {
            newSales = newSales.filter(s => s.id !== sale.id);
          }
        });

        // Re-ordenar por si acaso, especialmente después de añadir
        newSales.sort((a, b) => new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime());
        return newSales;
      });

      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to sales from Firestore:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAuthLoading]);

  const addSale = async (newSale: Omit<Sale, 'id' | 'timestamp'>): Promise<Sale | undefined> => {
    if (!user) throw new Error('User not authenticated to add sale');
    try {
      const { saleId } = await createSaleWithIndex(user.uid, newSale as any);
      if (!saleId) throw new Error('Sale creation failed, no ID returned.');
      return { ...newSale, id: saleId, timestamp: new Date().toISOString() } as Sale;
    } catch (error) {
      console.error('Error creating sale with index:', error);
      return undefined;
    }
  };

  const updateSale = async (id: string, updatedData: Partial<Omit<Sale, 'id'>>) => {
    if (!user) throw new Error('User not authenticated to update sale');
    try {
      // La lógica de onSnapshot se encargará de actualizar la UI de forma granular y correcta.
      await updateSaleWithIndex(user.uid, id, updatedData as any);
    } catch (error) {
      console.error('Error updating sale:', error);
      throw error;
    }
  };

  const deleteSale = async (id: string) => {
    if (!user) throw new Error('User not authenticated to delete sale');
    try {
      // La lógica de onSnapshot se encargará de actualizar la UI.
      const saleDocRef = doc(db, 'users', user.uid, 'sales', id);
      await deleteDoc(saleDocRef);
    } catch (error) { 
      console.error('Error deleting sale:', error);
    }
  };

  const value = {
    sales,
    addSale,
    updateSale,
    deleteSale,
    isLoading,
  };

  return (
    <SalesContext.Provider value={value}>
      {children}
    </SalesContext.Provider>
  );
}
