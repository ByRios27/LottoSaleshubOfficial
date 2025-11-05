'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // Importar el hook de autenticación
import { db } from '@/lib/firebase'; // Importar la instancia de la base de datos
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy
} from 'firebase/firestore';

// El tipo base no necesita cambios
interface SaleBase {
  id?: string; // El ID de Firestore será opcional
  ticketId: string;
  timestamp: string | Timestamp; // Permitir ambos para la transición
  schedules: string[];
  drawId: string;
}

export const usePersistentSales = <T extends SaleBase>(drawId: string | undefined) => {
  const { user } = useAuth(); // Obtener el usuario actual
  const [sales, setSales] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSalesFromFirestore = useCallback(async () => {
    // Solo proceder si hay un usuario y un drawId
    if (!user || !drawId) {
      setSales([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const salesCollectionRef = collection(db, 'users', user.uid, 'sales');
      const q = query(salesCollectionRef, where('drawId', '==', drawId), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const firestoreSales = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id, // Añadir el ID del documento
          // Asegurarse de que el timestamp es un string para mantener la compatibilidad
          timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
        } as T;
      });

      setSales(firestoreSales);
    } catch (error) {
      console.error("Error loading sales from Firestore:", error);
      setSales([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, drawId]);

  useEffect(() => {
    loadSalesFromFirestore();
  }, [loadSalesFromFirestore]);

  const addSale = useCallback(async (newSale: Omit<T, 'id'>) => {
    if (!user || !drawId) return;

    // Preparar los datos para Firestore (usando Timestamp)
    const saleDataForFirestore = {
      ...newSale,
      timestamp: Timestamp.fromDate(new Date(newSale.timestamp as string)),
      // Asegurarse de que drawId está incluido
      drawId: drawId,
    };

    try {
      const salesCollectionRef = collection(db, 'users', user.uid, 'sales');
      const docRef = await addDoc(salesCollectionRef, saleDataForFirestore);
      
      // Actualización optimista del estado local
      const addedSale = { ...newSale, id: docRef.id } as T;
      setSales(prevSales => [addedSale, ...prevSales]);

    } catch (error) {
      console.error("Error adding sale to Firestore:", error);
    }
  }, [user, drawId]);

  const deleteSale = useCallback(async (ticketId: string) => {
    if (!user) return;

    const saleToDelete = sales.find(s => s.ticketId === ticketId);
    if (!saleToDelete || !saleToDelete.id) return; // Necesita el ID de Firestore para eliminar

    try {
      const saleDocRef = doc(db, 'users', user.uid, 'sales', saleToDelete.id);
      await deleteDoc(saleDocRef);

      // Actualizar estado local
      setSales(prevSales => prevSales.filter(sale => sale.ticketId !== ticketId));
    } catch (error) {
      console.error("Error deleting sale from Firestore:", error);
    }
  }, [user, sales]);

  // La función de limpieza de sorteos expirados puede permanecer igual por ahora,
  // ya que opera sobre el estado local `sales`.
  // Una versión más avanzada podría hacer esto en el backend con Cloud Functions.
  const cleanUpExpiredSales = useCallback(() => {
    const currentTime = new Date();

    const getScheduleDateTimeForSale = (scheduleString: string, saleCreationDate: Date): Date => {
      const [time, modifier] = scheduleString.split(' ');
      const timeParts = time.split(':');
      let hours = Number(timeParts[0]);
      const minutes = Number(timeParts[1]);
      if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;

      const drawDateTime = new Date(saleCreationDate);
      drawDateTime.setHours(hours, minutes, 0, 0);

      if (drawDateTime < saleCreationDate) {
        drawDateTime.setDate(drawDateTime.getDate() + 1);
      }
      return drawDateTime;
    };

    const salesWithActiveSchedules = sales.map(sale => {
        const saleCreationDate = new Date(sale.timestamp as string);
        const activeSchedules = sale.schedules.filter(schedule => {
            const drawDateTime = getScheduleDateTimeForSale(schedule, saleCreationDate);
            const expirationDateTime = new Date(drawDateTime.getTime() + 12 * 60 * 60 * 1000);
            return currentTime < expirationDateTime;
        });
        return { ...sale, schedules: activeSchedules };
    });

    const finalSales = salesWithActiveSchedules.filter(sale => sale.schedules.length > 0);
    
    // Si hay ventas que han cambiado (porque sus horarios expiraron),
    // podrías considerar eliminarlas de Firestore aquí.
    // Por ahora, solo se actualiza el estado local.
    if (finalSales.length !== sales.length) {
      setSales(finalSales as T[]);
      // Opcional: Implementar la eliminación de Firestore para las ventas expiradas.
      const expiredSales = sales.filter(s => !finalSales.some(fs => fs.ticketId === s.ticketId));
      expiredSales.forEach(sale => {
        if(sale.id) {
          const saleDocRef = doc(db, 'users', user!.uid, 'sales', sale.id);
          deleteDoc(saleDocRef).catch(err => console.error("Error auto-deleting expired sale:", err));
        }
      });
    }
  }, [sales, user]);

  return { sales, addSale, deleteSale, isLoading, cleanUpExpiredSales };
};
