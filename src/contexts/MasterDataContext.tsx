'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Sale } from './SalesContext'; // Reutilizamos el tipo
import { Result } from './ResultsContext'; // Reutilizamos el tipo
import { Draw } from './DrawsContext'; // Reutilizamos el tipo

// --- ESTRUCTURA DE DATOS DEL CONTEXTO MAESTRO ---

interface MasterData {
  sales: Sale[];
  results: Result[];
  draws: Draw[];
  closedSchedules: string[]; // Dato derivado
}

interface MasterDataContextType {
  masterData: MasterData;
  isLoading: boolean;
}

// --- CREACIÓN DEL CONTEXTO ---
const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

// --- HOOK PARA USAR EL CONTEXTO ---
export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (context === undefined) {
    throw new Error('useMasterData must be used within a MasterDataProvider');
  }
  return context;
}

// --- COMPONENTE PROVEEDOR ---
export function MasterDataProvider({ children }: { children: ReactNode }) {
  const { user, loading: isAuthLoading } = useAuth();
  const [masterData, setMasterData] = useState<MasterData>({ sales: [], results: [], draws: [], closedSchedules: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) {
      setIsLoading(true);
      return;
    }
    if (!user) {
      setMasterData({ sales: [], results: [], draws: [], closedSchedules: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // --- SUSCRIPCIONES CENTRALIZADAS ---

    // 1. Suscripción a Ventas (Sales)
    const salesQuery = query(collection(db, 'users', user.uid, 'sales'), orderBy('timestamp', 'desc'));
    const unsubscribeSales = onSnapshot(salesQuery, (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data()),
        timestamp: (doc.data().timestamp as Timestamp)?.toDate?.().toISOString() ?? doc.data().timestamp,
      })) as Sale[];
      setMasterData(prevData => ({ ...prevData, sales: salesData }));
      setIsLoading(false); // Podríamos hacer esto más granular luego
    }, (error) => console.error("MasterData Error (Sales):", error));

    // 2. Suscripción a Resultados (Results)
    const resultsQuery = query(collection(db, 'users', user.uid, 'results'), orderBy('timestamp', 'desc'));
    const unsubscribeResults = onSnapshot(resultsQuery, (snapshot) => {
        const resultsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Result[];

        // Derivamos los horarios cerrados a partir de los resultados
        const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Santo_Domingo' }).format(new Date());
        const closed = resultsData
            .filter(r => (r.timestamp as any)?.toDate?.().toISOString().startsWith(today))
            .map(r => `${r.drawId}-${r.schedule}`);

        setMasterData(prevData => ({
            ...prevData,
            results: resultsData,
            closedSchedules: closed,
        }));
    }, (error) => console.error("MasterData Error (Results):", error));

    // 3. Suscripción a Sorteos (Draws)
    const drawsQuery = query(collection(db, 'users', user.uid, 'draws'), orderBy("name", "asc"));
    const unsubscribeDraws = onSnapshot(drawsQuery, (snapshot) => {
        const drawsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Draw[];
        setMasterData(prevData => ({ ...prevData, draws: drawsData }));
    }, (error) => console.error("MasterData Error (Draws):", error));


    // Función de limpieza para cancelar todas las suscripciones
    return () => {
      unsubscribeSales();
      unsubscribeResults();
      unsubscribeDraws();
    };
  }, [user, isAuthLoading]);

  const value = { masterData, isLoading };

  return (
    <MasterDataContext.Provider value={value}>
      {children}
    </MasterDataContext.Provider>
  );
}
