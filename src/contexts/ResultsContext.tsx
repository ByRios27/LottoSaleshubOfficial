'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { useDraws } from "./DrawsContext"; // Import useDraws

// --- Definición de Tipos ---
export type Result = {
  id: string;
  drawId: string;
  drawName: string;
  schedule: string;
  winningNumbers: { "1ro": string; "2do": string; "3ro": string };
  timestamp: string;
};

export type Winner = {
  ticketId: string;
  clientName: string; // Nombre del cliente
  drawName: string;
  schedule: string;
  play: { number: string; amount: number };
  prize: string;
  timestamp: string;
};

// El tipo Sale ahora incluye opcionalmente el nombre del cliente
export type Sale = {
  ticketId: string;
  clientName?: string; 
  timestamp: string;
  drawId: string;
  schedules: string[];
  numbers: { number: string; quantity: number }[];
  totalCost: number;
};

type ResultsContextType = {
  results: Result[];
  winners: Winner[];
  allSales: Sale[];
  addResult: (newResultData: Omit<Result, "id" | "timestamp">) => void;
  deleteResult: (id: string) => void;
  updateResult: (id: string, updatedData: Partial<Omit<Result, "id">>) => void;
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

export function ResultsProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<Result[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { draws } = useDraws(); // Obtener la lista de sorteos
  const [allSales, setAllSales] = useState<Sale[]>([]);

  // Carga todas las ventas desde localStorage
  const loadAllSales = useCallback(() => {
    if (typeof window === 'undefined' || !draws) return;

    const combinedSales: Sale[] = [];
    draws.forEach(draw => {
      try {
        const savedSalesJSON = localStorage.getItem(`salesHistory_${draw.id}`);
        if (savedSalesJSON) {
          const savedSales: Sale[] = JSON.parse(savedSalesJSON);
          combinedSales.push(...savedSales.map(s => ({ ...s, drawId: draw.id })));
        }
      } catch (error) {
        console.error(`Error loading sales for draw ${draw.id}:`, error);
      }
    });
    setAllSales(combinedSales);
  }, [draws]);

  // Carga inicial de datos
  useEffect(() => {
    setIsLoading(true);
    try {
      const savedResults = window.localStorage.getItem("resultsData");
      if (savedResults) {
        setResults(JSON.parse(savedResults));
      }
      loadAllSales();
    } catch (error) {
      console.error("Error loading data from localStorage", error);
    } finally {
      setIsLoading(false);
    }
  }, [loadAllSales]);

  // Sincronización entre pestañas
  useEffect(() => {
      const handleStorageChange = (event: StorageEvent) => {
          if (event.key?.startsWith('salesHistory_')) {
              loadAllSales();
          }
          if (event.key === 'resultsData') {
              try {
                  const savedResults = window.localStorage.getItem("resultsData");
                  if (savedResults) {
                      setResults(JSON.parse(savedResults));
                  }
              } catch (error) {
                  console.error("Error parsing results from storage event", error);
              }
          }
      };

      window.addEventListener('storage', handleStorageChange);
      return () => {
          window.removeEventListener('storage', handleStorageChange);
      };
  }, [loadAllSales]);

  // Guardar resultados en localStorage
  useEffect(() => {
    if (!isLoading) {
      try {
        window.localStorage.setItem("resultsData", JSON.stringify(results));
      } catch (error) {
        console.error("Error saving results to localStorage", error);
      }
    }
  }, [results, isLoading]);

  // --- Lógica principal para calcular ganadores ---
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
              timestamp: sale.timestamp,
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

  const addResult = (newResultData: Omit<Result, "id" | "timestamp">) => {
    const newResult: Result = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...newResultData,
    };
    setResults((prevResults) => [newResult, ...prevResults]);
  };

  const deleteResult = (id: string) => {
    setResults((prevResults) => prevResults.filter((r) => r.id !== id));
  };

  const updateResult = (
    id: string,
    updatedData: Partial<Omit<Result, "id">>,
  ) => {
    setResults((prevResults) =>
      prevResults.map((r) => (r.id === id ? { ...r, ...updatedData } : r)),
    );
  };

  const value = {
    results,
    winners,
    allSales,
    addResult,
    deleteResult,
    updateResult,
    isLoading,
  };

  return (
    <ResultsContext.Provider value={value}>{children}</ResultsContext.Provider>
  );
}
