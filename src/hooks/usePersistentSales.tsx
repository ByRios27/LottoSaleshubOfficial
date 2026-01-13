'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp,
  orderBy,
  onSnapshot // Importar onSnapshot
} from 'firebase/firestore';

interface SaleBase {
  id?: string;
  ticketId: string;
  timestamp: string | Timestamp;
  schedules: string[];
  drawId: string;
}

export const usePersistentSales = <T extends SaleBase>(drawId: string | undefined) => {
  const { user } = useAuth();
  const [sales, setSales] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Si no hay usuario o drawId, no hacer nada y limpiar el estado.
    if (!user || !drawId) {
      setSales([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const salesCollectionRef = collection(db, 'users', user.uid, 'sales');
    const q = query(salesCollectionRef, where('drawId', '==', drawId), orderBy('timestamp', 'desc'));

    // Configurar el listener en tiempo real
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const firestoreSales = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
        } as T;
      });

      setSales(firestoreSales);
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to sales from Firestore:", error);
      setSales([]);
      setIsLoading(false);
    });

    // Devolver la función de limpieza para que se ejecute cuando el componente se desmonte
    // o cambien las dependencias (user, drawId).
    return () => unsubscribe();

  }, [user, drawId]); // Dependencias del efecto

  const addSale = useCallback(async (newSale: Omit<T, 'id'>) => {
    if (!user || !drawId) return;

    const saleDataForFirestore = {
      ...newSale,
      timestamp: Timestamp.fromDate(new Date(newSale.timestamp as string)),
      drawId: drawId,
    };

    try {
      const salesCollectionRef = collection(db, 'users', user.uid, 'sales');
      // No es necesario actualizar el estado local aquí, onSnapshot lo hará automáticamente.
      await addDoc(salesCollectionRef, saleDataForFirestore);
    } catch (error) {
      console.error("Error adding sale to Firestore:", error);
    }
  }, [user, drawId]);

  const deleteSale = useCallback(async (ticketId: string) => {
    if (!user) return;

    const saleToDelete = sales.find(s => s.ticketId === ticketId);
    if (!saleToDelete || !saleToDelete.id) return;

    try {
      const saleDocRef = doc(db, 'users', user.uid, 'sales', saleToDelete.id);
      // No es necesario actualizar el estado local aquí, onSnapshot lo hará automáticamente.
      await deleteDoc(saleDocRef);
    } catch (error) {
      console.error("Error deleting sale from Firestore:", error);
    }
  }, [user, sales]);

  // La función cleanUpExpiredSales ha sido eliminada por completo.

  return { sales, addSale, deleteSale, isLoading };
};
