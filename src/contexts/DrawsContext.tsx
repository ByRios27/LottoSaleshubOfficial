'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // Para la autenticación
import { db } from '@/lib/firebase'; // Acceso a la BD de Firestore
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { initialDraws } from '@/lib/placeholder-data'; // Datos iniciales

// --- Definición de Tipos (sin cambios) ---
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
  isLoading: boolean; // Para que la UI sepa que estamos cargando datos
};

// --- Creación del Contexto (sin cambios) ---
const DrawsContext = createContext<DrawsContextType | undefined>(undefined);

// --- Hook Personalizado (sin cambios) ---
export function useDraws() {
  const context = useContext(DrawsContext);
  if (context === undefined) {
    throw new Error('useDraws must be used within a DrawsProvider');
  }
  return context;
}

// --- Proveedor del Contexto (Lógica de Firestore) ---
interface DrawsProviderProps {
  children: ReactNode;
}

export function DrawsProvider({ children }: DrawsProviderProps) {
  const { user } = useAuth(); // Obtener el usuario actual
  const [draws, setDraws] = useState<Draw[]>([]); // Iniciar con array vacío
  const [isLoading, setIsLoading] = useState(true); // Empezar en estado de carga

  // Efecto para cargar los sorteos desde Firestore cuando el usuario está disponible
  useEffect(() => {
    if (user) {
      const fetchDraws = async () => {
        setIsLoading(true);
        const drawsCollectionRef = collection(db, 'users', user.uid, 'draws');
        const q = query(drawsCollectionRef, orderBy('name', 'asc')); // Ordenar por nombre
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          // Si el usuario no tiene sorteos, creamos los de por defecto
          console.log('No draws found, seeding initial data...');
          const batch = writeBatch(db);
          const seededDraws: Draw[] = [];
          initialDraws.forEach((draw) => {
            const newDrawRef = doc(drawsCollectionRef, draw.id); // Usamos el ID predefinido
            batch.set(newDrawRef, draw);
            seededDraws.push(draw);
          });
          await batch.commit();
          setDraws(seededDraws.sort((a,b) => a.name.localeCompare(b.name)));
        } else {
          // Si hay sorteos, los cargamos
          const userDraws = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Draw[];
          setDraws(userDraws);
        }
        setIsLoading(false);
      };

      fetchDraws().catch(console.error);
    }
  }, [user]); // Se ejecuta cada vez que el usuario cambia

  // --- Funciones de Modificación con Firestore ---
  const addDraw = async (newDrawData: Omit<Draw, 'id'>) => {
    if (!user) throw new Error('User not authenticated');
    const drawsCollectionRef = collection(db, 'users', user.uid, 'draws');
    
    // Añadir el nuevo sorteo a Firestore
    const newDocRef = await addDoc(drawsCollectionRef, newDrawData);
    
    // Actualizar el estado local (actualización optimista)
    const newDraw: Draw = { id: newDocRef.id, ...newDrawData };
    setDraws(prevDraws => [newDraw, ...prevDraws].sort((a,b) => a.name.localeCompare(b.name)));
  };

  const updateDraw = async (updatedDraw: Draw) => {
    if (!user) throw new Error('User not authenticated');
    const drawDocRef = doc(db, 'users', user.uid, 'draws', updatedDraw.id);

    // Actualizar el documento en Firestore
    await updateDoc(drawDocRef, { ...updatedDraw });

    // Actualizar el estado local
    setDraws(prevDraws =>
      prevDraws.map(d => (d.id === updatedDraw.id ? updatedDraw : d))
    );
  };

  const deleteDraw = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    const drawDocRef = doc(db, 'users', user.uid, 'draws', id);

    // Borrar el documento de Firestore
    await deleteDoc(drawDocRef);

    // Actualizar el estado local
    setDraws(prevDraws => prevDraws.filter(d => d.id !== id));
  };

  const value = { draws, addDraw, updateDraw, deleteDraw, isLoading };

  return (
    <DrawsContext.Provider value={value}>
      {children}
    </DrawsContext.Provider>
  );
}
