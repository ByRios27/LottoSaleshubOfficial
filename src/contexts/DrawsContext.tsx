'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  writeBatch,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { initialDraws } from "@/lib/placeholder-data";

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
  resetDraws: () => Promise<void>; // <--- REINCORPORADO
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

// --- Proveedor del Contexto ---
export function DrawsProvider({ children }: { children: ReactNode }) {
  const { user, loading: isAuthLoading } = useAuth();
  const [draws, setDraws] = useState<Draw[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) {
      setIsLoading(true);
      return;
    }
    if (!user) {
      setDraws([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const drawsCollectionRef = collection(db, 'users', user.uid, 'draws');
    const q = query(drawsCollectionRef, orderBy("name", "asc"));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      if (querySnapshot.empty) {
        console.log("No draws found, seeding initial data...");
        const batch = writeBatch(db);
        initialDraws.forEach((draw) => {
          const newDrawRef = doc(drawsCollectionRef, draw.id);
          batch.set(newDrawRef, draw);
        });
        await batch.commit();
      } else {
        const userDraws = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Draw, 'id'>),
        }));
        setDraws(userDraws);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to draws from Firestore:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAuthLoading]);

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

  // <--- FUNCIÓN REINCORPORADA ---
  const resetDraws = useCallback(async () => {
    if (!user) throw new Error("User not authenticated");
    setIsLoading(true);
    const drawsCollectionRef = collection(db, 'users', user.uid, 'draws');
    try {
      const batch = writeBatch(db);
      const currentDrawsSnapshot = await getDocs(query(drawsCollectionRef));
      currentDrawsSnapshot.forEach(doc => batch.delete(doc.ref));
      initialDraws.forEach(draw => {
        const newDrawRef = doc(drawsCollectionRef, draw.id);
        batch.set(newDrawRef, draw);
      });
      await batch.commit();
    } catch (error) {
      console.error("Error resetting draws:", error);
      throw error;
    } finally {
      // El listener de onSnapshot se encargará de actualizar el estado y el isLoading.
    }
  }, [user]);

  const value = { draws, addDraw, updateDraw, deleteDraw, resetDraws, isLoading };

  return (
    <DrawsContext.Provider value={value}>{children}</DrawsContext.Provider>
  );
}
