'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext"; // Para la autenticación
import { useSales } from "./SalesContext"; // Para obtener las ventas
import { db } from "@/lib/firebase"; // Conexión a Firestore
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

// --- Definición de Tipos ---
export type Result = {
  id: string;
  drawId: string;
  drawName: string;
  schedule: string;
  winningNumbers: { "1ro": string; "2do": string; "3ro": string };
  timestamp: Timestamp;
};

export type Winner = {
  ticketId: string;
  clientName: string;
  drawName: string;
  schedule: string;
  play: { number: string; amount: number };
  prize: string;
  timestamp: string;
};

// El tipo Sale ya viene de SalesContext, no es necesario redefinirlo

// --- Contexto de React ---
type ResultsContextType = {
  results: Result[];
  winners: Winner[];
  addResult: (newResultData: Omit<Result, "id" | "timestamp">) => Promise<void>;
  deleteResult: (id: string) => Promise<void>;
  updateResult: (id: string, updatedData: Partial<Omit<Result, "id">>) => Promise<void>;
  isLoading: boolean;
};

const ResultsContext = createContext<ResultsContextType | undefined>(undefined);

export function useResults() {
  const context = useContext(ResultsContext);
  if (context === undefined) {
    throw new Error("useResults must be used within a ResultsProvider");
  }
  return context;
}

// --- Proveedor del Contexto ---
export function ResultsProvider({ children }: { children: ReactNode }) {
  const { user, loading: isAuthLoading } = useAuth();
  const { sales: allSales } = useSales(); // Obtener ventas del SalesContext
  const [results, setResults] = useState<Result[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carga y escucha de resultados desde Firestore
  useEffect(() => {
    if (isAuthLoading) {
      setIsLoading(true);
      return;
    }
    if (!user) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const resultsCollectionRef = collection(db, 'users', user.uid, 'results');
    const q = query(resultsCollectionRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const firestoreResults = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Result, 'id'>),
      }));
      setResults(firestoreResults);
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to results from Firestore:", error);
      setIsLoading(false);
    });

    return () => unsubscribe(); // Limpiar la suscripción
  }, [user, isAuthLoading]);

  // Lógica para calcular ganadores
  const calculateWinners = useCallback(() => {
    if (allSales.length === 0 || results.length === 0) {
      setWinners([]);
      return;
    }

    const newWinners: Winner[] = [];

    results.forEach((result) => {
        const winningNums = result.winningNumbers;
        const prizeMapping: Record<string, string> = {
            [winningNums["1ro"]]: "1ro",
            [winningNums["2do"]]: "2do",
            [winningNums["3ro"]]: "3ro",
        };

        const relevantSales = allSales.filter(
            (sale) =>
            sale.drawId === result.drawId && sale.schedules.includes(result.schedule)
        );

        relevantSales.forEach((sale) => {
            sale.numbers.forEach((play) => {
                const prize = prizeMapping[play.number];
                if (prize) {
                    const quantity = Number(play.quantity) || 0;

                    newWinners.push({
                        ticketId: sale.ticketId,
                        clientName: sale.clientName || 'Desconocido',
                        drawName: result.drawName,
                        schedule: result.schedule,
                        play: { number: play.number, amount: quantity },
                        prize,
                        timestamp: sale.timestamp as string,
                    });
                }
            });
        });
    });

    setWinners(newWinners);
  }, [allSales, results]);

  useEffect(() => {
    calculateWinners();
  }, [calculateWinners]);

  // --- Funciones CRUD para Firestore ---
  const addResult = async (newResultData: Omit<Result, "id" | "timestamp">) => {
    if (!user) throw new Error("User not authenticated");
    const resultsCollectionRef = collection(db, 'users', user.uid, 'results');
    await addDoc(resultsCollectionRef, {
      ...newResultData,
      timestamp: serverTimestamp(),
    });
  };

  const deleteResult = async (id: string) => {
    if (!user) throw new Error("User not authenticated");
    const resultDocRef = doc(db, 'users', user.uid, 'results', id);
    await deleteDoc(resultDocRef);
  };

  const updateResult = async (id: string, updatedData: Partial<Omit<Result, "id">>) => {
    if (!user) throw new Error("User not authenticated");
    const resultDocRef = doc(db, 'users', user.uid, 'results', id);
    await updateDoc(resultDocRef, updatedData);
  };

  const value = {
    results,
    winners,
    addResult,
    deleteResult,
    updateResult,
    isLoading,
  };

  return (
    <ResultsContext.Provider value={value}>{children}</ResultsContext.Provider>
  );
}
