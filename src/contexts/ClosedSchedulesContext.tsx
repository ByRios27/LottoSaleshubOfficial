'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

/**
 * Gets the current date as a string in 'YYYY-MM-DD' format for the Dominican Republic timezone.
 * @returns {string} The formatted date string.
 */
function getDominicanDateString(): string {
    const date = new Date();
    // Using a locale like 'sv-SE' with the correct timezone provides the desired YYYY-MM-DD format.
    return new Intl.DateTimeFormat('sv-SE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/Santo_Domingo',
    }).format(date);
}

// --- Types and Context Definition ---
type ClosedSchedulesContextType = {
  closedSchedules: string[];
  isLoading: boolean;
};

const ClosedSchedulesContext = createContext<ClosedSchedulesContextType | undefined>(undefined);

export function useClosedSchedules() {
  const context = useContext(ClosedSchedulesContext);
  if (context === undefined) {
    throw new Error('useClosedSchedules must be used within a ClosedSchedulesProvider');
  }
  return context;
}

// --- Context Provider ---
export function ClosedSchedulesProvider({ children }: { children: ReactNode }) {
  const { user, loading: isAuthLoading } = useAuth();
  const [closedSchedules, setClosedSchedules] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) {
      setIsLoading(true);
      return;
    }
    if (!user) {
      setClosedSchedules([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const today = getDominicanDateString();
    const resultsCollectionRef = collection(db, 'users', user.uid, 'results');
    const q = query(resultsCollectionRef, where('date', '==', today));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const closed: string[] = [];
      snapshot.forEach(doc => {
        const result = doc.data();
        // Create a unique identifier for the closed draw schedule
        closed.push(`${result.drawId}-${result.schedule}`);
      });
      setClosedSchedules(closed);
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to closed schedules:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAuthLoading]);

  const value = { closedSchedules, isLoading };

  return (
    <ClosedSchedulesContext.Provider value={value}>
      {children}
    </ClosedSchedulesContext.Provider>
  );
}
