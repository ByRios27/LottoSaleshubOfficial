'use client';

import {
  createContext,
  useContext,
  ReactNode,
  useCallback
} from "react";
import { useMasterData } from "./MasterDataContext";
import { Timestamp } from "firebase/firestore";
import { addResult as addResultAction, deleteResult as deleteResultAction, updateResult as updateResultAction } from '@/app/(dashboard)/results/actions';
import { useAuth } from "./AuthContext";

// --- Definición de Tipos (sin cambios) ---
export type Result = {
  id: string;
  drawId: string;
  drawName: string;
  schedule: string;
  winningNumbers: { "1ro": string; "2do": string; "3ro": string };
  timestamp: Timestamp;
};

// --- Contexto de React (Refactorizado) ---
type ResultsContextType = {
  results: Result[];
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

// --- Proveedor del Contexto (Refactorizado) ---
export function ResultsProvider({ children }: { children: ReactNode }) {
  const { masterData, isLoading } = useMasterData();
  const { user } = useAuth();

  const addResult = useCallback(async (newResultData: Omit<Result, "id" | "timestamp">) => {
    if (!user) throw new Error("User not authenticated");
    await addResultAction(user.uid, newResultData);
  }, [user]);

  const deleteResult = useCallback(async (id: string) => {
    if (!user) throw new Error("User not authenticated");
    await deleteResultAction(user.uid, id);
  }, [user]);

  const updateResult = useCallback(async (id: string, updatedData: Partial<Omit<Result, "id">>) => {
    if (!user) throw new Error("User not authenticated");
    await updateResultAction(user.uid, id, updatedData);
  }, [user]);

  const value = {
    results: masterData.results,
    addResult,
    deleteResult,
    updateResult,
    isLoading,
  };

  return (
    <ResultsContext.Provider value={value}>{children}</ResultsContext.Provider>
  );
}
