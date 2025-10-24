'use client';

import { useState, useEffect, useCallback } from 'react';

// Define a base type for what the hook needs to function
interface SaleBase {
  ticketId: string;
  timestamp: string;
  schedules: string[];
}

// Hook to manage sales in localStorage, now generic and with auto-cleanup
export const usePersistentSales = <T extends SaleBase>(drawId: string | undefined) => {
  const storageKey = drawId ? `salesHistory_${drawId}` : null;
  const [sales, setSales] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSalesFromStorage = useCallback(() => {
      if (typeof window !== 'undefined' && storageKey) {
          setIsLoading(true);
          try {
              const savedSalesJSON = localStorage.getItem(storageKey);
              const savedSales: T[] = savedSalesJSON ? JSON.parse(savedSalesJSON) : [];
              setSales(savedSales);
          } catch (error) {
              console.error("Error loading sales from localStorage:", error);
              setSales([]);
          } finally {
              setIsLoading(false);
          }
      } else {
        setIsLoading(false);
      }
  }, [storageKey]);

  useEffect(() => {
    loadSalesFromStorage();
  }, [loadSalesFromStorage]);

  const cleanUpExpiredSales = useCallback(() => {
    if (typeof window === 'undefined' || !storageKey) return;

    try {
        const savedSalesJSON = localStorage.getItem(storageKey);
        if (!savedSalesJSON) return;

        const currentSales: T[] = JSON.parse(savedSalesJSON);
        const originalSalesString = JSON.stringify(currentSales);
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

        const salesWithActiveSchedules = currentSales.map(sale => {
            const saleCreationDate = new Date(sale.timestamp);
            const activeSchedules = sale.schedules.filter(schedule => {
                const drawDateTime = getScheduleDateTimeForSale(schedule, saleCreationDate);
                const expirationDateTime = new Date(drawDateTime.getTime() + 12 * 60 * 60 * 1000);
                return currentTime < expirationDateTime;
            });
            return { ...sale, schedules: activeSchedules };
        });

        const finalSales = salesWithActiveSchedules.filter(sale => sale.schedules.length > 0);
        const finalSalesString = JSON.stringify(finalSales);

        if (finalSalesString !== originalSalesString) {
            localStorage.setItem(storageKey, finalSalesString);
            setSales(finalSales as T[]); // Cast back to T[]
        }

    } catch (error) {
        console.error("Error during expired sales cleanup:", error);
    }
  }, [storageKey]);

  const addSale = useCallback((newSale: T) => {
    if (!storageKey) return;
    setSales(prevSales => {
        const updatedSales = [newSale, ...prevSales];
        localStorage.setItem(storageKey, JSON.stringify(updatedSales));
        return updatedSales;
    });
  }, [storageKey]);

  const deleteSale = useCallback((ticketId: string) => {
    if (!storageKey) return;
    setSales(prevSales => {
        const updatedSales = prevSales.filter(sale => sale.ticketId !== ticketId);
        localStorage.setItem(storageKey, JSON.stringify(updatedSales));
        return updatedSales;
    });
  }, [storageKey]);

  return { sales, addSale, deleteSale, isLoading, cleanUpExpiredSales };
};
