'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { useMasterData } from "./MasterDataContext";
import { useAuth } from "./AuthContext";
import {
    addDoc, 
    updateDoc, 
    deleteDoc, 
    collection, 
    doc 
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// --- Tipos y Contexto ---
export type Draw = {
  id: string;
  name: string;
  logo?: string;
  cif: number;
  cost: number;
  sch: string[];
};

type DrawsContextType = {
  draws: Draw[];
  addDraw: (newDraw: Omit<Draw, 'id'>) => Promise<void>;
  updateDraw: (updatedDraw: Draw) => Promise<void>;
  deleteDraw: (id: string) => Promise<void>;
  isLoading: boolean;
};

const DrawsContext = createContext<DrawsContextType | undefined>(undefined);

export function useDraws() {
  const context = useContext(DrawsContext);
  if (context === undefined) {
    throw new Error("useDraws must be used within a DrawsProvider");
  }
  return context;
}

// --- Proveedor del Contexto (Refactorizado con Caché) ---
export function DrawsProvider({ children }: { children: ReactNode }) {
  const { masterData, isLoading: isMasterLoading } = useMasterData();
  const { user } = useAuth();
  const [localDraws, setLocalDraws] = useState<Draw[]>([]);

  const DRAWS_CACHE_KEY = user ? `draws_cache_${user.uid}` : null;

  // Efecto para cargar desde caché al inicio
  useEffect(() => {
    if (DRAWS_CACHE_KEY) {
      try {
        const cachedDraws = localStorage.getItem(DRAWS_CACHE_KEY);
        if (cachedDraws) {
          setLocalDraws(JSON.parse(cachedDraws));
        }
      } catch (error) {
        console.error("Error reading draws from localStorage:", error);
      }
    }
  }, [DRAWS_CACHE_KEY]);

  // Efecto para actualizar el estado y la caché cuando los datos maestros cambian
  useEffect(() => {
    // Solo actualizamos si los datos maestros han cambiado y no están vacíos
    if (masterData.draws.length > 0) {
      setLocalDraws(masterData.draws);
      if (DRAWS_CACHE_KEY) {
        try {
          localStorage.setItem(DRAWS_CACHE_KEY, JSON.stringify(masterData.draws));
        } catch (error) {
          console.error("Error saving draws to localStorage:", error);
        }
      }
    }
  }, [masterData.draws, DRAWS_CACHE_KEY]);

  // --- Funciones CRUD (apuntan a Firestore directamente, la UI se actualizará vía MasterData) ---
  const addDraw = useCallback(async (newDrawData: Omit<Draw, 'id'>) => {
    if (!user) throw new Error("User not authenticated");
    const drawsCollectionRef = collection(db, 'users', user.uid, 'draws');
    await addDoc(drawsCollectionRef, newDrawData);
  }, [user]);

  const updateDraw = useCallback(async (updatedDraw: Draw) => {
    if (!user) throw new Error("User not authenticated");
    const drawDocRef = doc(db, 'users', user.uid, 'draws', updatedDraw.id);
    const { id, ...dataToUpdate } = updatedDraw;
    await updateDoc(drawDocRef, dataToUpdate);
  }, [user]);

  const deleteDraw = useCallback(async (id: string) => {
    if (!user) throw new Error("User not authenticated");
    const drawDocRef = doc(db, 'users', user.uid, 'draws', id);
    await deleteDoc(drawDocRef);
  }, [user]);

  const value = {
    draws: localDraws, // Usamos el estado local cacheado
    addDraw,
    updateDraw,
    deleteDraw,
    // El `isLoading` ahora es más complejo: es true si la carga maestra está en curso Y no tenemos nada en la caché.
    isLoading: isMasterLoading && localDraws.length === 0,
  };

  return (
    <DrawsContext.Provider value={value}>{children}</DrawsContext.Provider>
  );
}
