'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp
} from 'firebase/firestore';

// --- Definición de Tipos ---
export type Sale = {
  id?: string; // ID de Firestore
  ticketId: string;
  timestamp: Timestamp; // Usar Firestore Timestamp para ordenar
  drawId: string;
  drawName: string; // Guardar nombre para facilitar la visualización
  drawLogo?: string; // Guardar logo para facilitar la visualización
  schedules: string[];
  numbers: { number: string; quantity: number }[];
  sellerId: string;
  clientName?: string;
  clientPhone?: string;
  costPerFraction: number;
  totalCost: number;
  receiptUrl: string; // <- CAMPO CLAVE: URL de la imagen del ticket en Storage
};

type SalesContextType = {
  sales: Sale[];
  addSale: (newSale: Omit<Sale, 'id'>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
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
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Efecto para cargar las ventas desde Firestore
  useEffect(() => {
    if (user) {
      const fetchSales = async () => {
        setIsLoading(true);
        const salesCollectionRef = collection(db, 'users', user.uid, 'sales');
        // Ordenar por fecha descendente para mostrar las más recientes primero
        const q = query(salesCollectionRef, orderBy('timestamp', 'desc'));
        
        try {
          const querySnapshot = await getDocs(q);
          const userSales = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Sale[];
          setSales(userSales);
        } catch (error) {
          console.error("Error fetching sales from Firestore:", error);
        }
        setIsLoading(false);
      };

      fetchSales();
    } else {
      // Si no hay usuario, limpiar los datos
      setSales([]);
      setIsLoading(false);
    }
  }, [user]);

  const addSale = async (newSale: Omit<Sale, 'id'>) => {
    if (!user) throw new Error('User not authenticated to add sale');
    
    const salesCollectionRef = collection(db, 'users', user.uid, 'sales');
    const newDocRef = await addDoc(salesCollectionRef, newSale);
    
    // Actualización optimista del estado local
    setSales(prevSales => [{ id: newDocRef.id, ...newSale }, ...prevSales]);
  };

  const deleteSale = async (id: string) => {
    if (!user) throw new Error('User not authenticated to delete sale');
    
    const saleDocRef = doc(db, 'users', user.uid, 'sales', id);
    await deleteDoc(saleDocRef);
    
    // Actualizar estado local
    setSales(prevSales => prevSales.filter(sale => sale.id !== id));
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
