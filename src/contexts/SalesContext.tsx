'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { createSaleWithIndex } from '@/app/(dashboard)/sales/actions';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot, // Import onSnapshot for real-time updates
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';

// --- Definición de Tipos ---
export type Sale = {
  id?: string;
  ticketId: string;
  timestamp: Timestamp | string; // Kept for type consistency
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
  const { user, loading: isAuthLoading } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // useEffect for real-time updates with onSnapshot
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

    const salesCollectionRef = collection(db, 'users', user.uid, 'sales');
    const q = query(salesCollectionRef, orderBy('timestamp', 'desc'));

    // Set up the real-time listener
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const userSales = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Convert Firestore Timestamp to ISO string for consistency
            timestamp: (data.timestamp as Timestamp)?.toDate?.()?.toISOString() ?? data.timestamp,
          } as Sale;
        });
        setSales(userSales);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error listening to sales from Firestore:", error);
        setIsLoading(false);
      }
    );

    // Cleanup listener on component unmount
    return () => unsubscribe();

  }, [user, isAuthLoading]);

  // Simplified addSale function
  const addSale = async (newSale: Omit<Sale, 'id' | 'timestamp'>): Promise<Sale | undefined> => {
    if (!user) throw new Error('User not authenticated to add sale');

    try {
      // Call the robust server action
      const result = await createSaleWithIndex(user.uid, newSale as any);
      
      // Handle the response from the server action
      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.saleId) {
        throw new Error('Sale creation failed, no ID returned.');
      }
      
      // With onSnapshot, we don't need to manually update state here.
      // We return the created sale object for any immediate UI feedback (like navigating to a receipt page)
      const createdSale: Sale = {
        ...newSale,
        id: result.saleId,
        timestamp: new Date().toISOString(), // This is a temporary client-side timestamp
      };

      return createdSale;

    } catch (error) {
      console.error('Error in addSale function:', error);
      return undefined; // Indicate failure
    }
  };

  // Simplified deleteSale function
  const deleteSale = async (id: string) => {
    if (!user) throw new Error('User not authenticated to delete sale');
    // onSnapshot will handle the UI update automatically.
    try {
      const saleDocRef = doc(db, 'users', user.uid, 'sales', id);
      await deleteDoc(saleDocRef);
    } catch (error) {
      console.error('Error deleting sale:', error);
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
