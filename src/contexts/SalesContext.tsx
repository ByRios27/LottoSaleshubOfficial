'use client';

import { createContext, useContext, ReactNode, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMasterData } from '@/contexts/MasterDataContext';
import { createSaleWithIndex, updateSaleWithIndex } from '@/app/(dashboard)/sales/actions';
import { deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

// --- Proveedor del Contexto (Refactorizado) ---
export function SalesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { masterData, isLoading } = useMasterData();

  const addSale = useCallback(async (newSale: Omit<Sale, 'id' | 'timestamp'>): Promise<Sale | undefined> => {
    if (!user) throw new Error('User not authenticated to add sale');
    try {
      const { saleId } = await createSaleWithIndex(user.uid, newSale as any);
      if (!saleId) throw new Error('Sale creation failed, no ID returned.');
      // La UI se actualizará automáticamente gracias a MasterDataProvider
      return { ...newSale, id: saleId, timestamp: new Date().toISOString() } as Sale;
    } catch (error) {
      console.error('Error creating sale with index:', error);
      return undefined;
    }
  }, [user]);

  const updateSale = useCallback(async (id: string, updatedData: Partial<Omit<Sale, 'id'>>) => {
    if (!user) throw new Error('User not authenticated to update sale');
    try {
      // La UI se actualizará automáticamente gracias a MasterDataProvider
      await updateSaleWithIndex(user.uid, id, updatedData as any);
    } catch (error) {
      console.error('Error updating sale:', error);
      throw error;
    }
  }, [user]);

  const deleteSale = useCallback(async (id: string) => {
    if (!user) throw new Error('User not authenticated to delete sale');
    try {
      // La UI se actualizará automáticamente gracias a MasterDataProvider
      const saleDocRef = doc(db, 'users', user.uid, 'sales', id);
      await deleteDoc(saleDocRef);
    } catch (error) {
      console.error('Error deleting sale:', error);
    }
  }, [user]);

  const value = {
    sales: masterData.sales,
    addSale,
    updateSale,
    deleteSale,
    isLoading,
  };

  return (
    <SalesContext.Provider value={value}>{children}</SalesContext.Provider>
  );
}
