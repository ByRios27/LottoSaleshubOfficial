'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useDraws, Draw } from './DrawsContext';

// --- Tipos ---
export type UnifiedSchedule = {
    drawId: string;
    drawName: string;
    schedule: string;
    logo?: string;
    cost: number;
    cif: number;
};

type UnifiedSchedulesContextType = {
    unifiedSchedules: UnifiedSchedule[];
    isLoading: boolean;
};

// --- Contexto ---
const UnifiedSchedulesContext = createContext<UnifiedSchedulesContextType | undefined>(undefined);

export const useUnifiedSchedules = () => {
    const context = useContext(UnifiedSchedulesContext);
    if (!context) {
        throw new Error('useUnifiedSchedules must be used within a UnifiedSchedulesProvider');
    }
    return context;
};

// --- Funciones de Utilidad ---
const parseTime = (timeStr: string) => {
    const lowerTimeStr = timeStr.toLowerCase();
    const isPM = lowerTimeStr.includes('pm');
    const isAM = lowerTimeStr.includes('am');
    
    const timePart = lowerTimeStr.replace('am', '').replace('pm', '').trim();
    let [hours, minutes] = timePart.split(':').map(Number);

    if (isNaN(hours)) hours = 0;
    if (isNaN(minutes)) minutes = 0;

    if (isPM && hours < 12) {
        hours += 12;
    } else if (isAM && hours === 12) { // Medianoche es 12 AM
        hours = 0;
    }
    
    return hours * 60 + minutes; // Minutos totales desde la medianoche
};

// --- Proveedor ---
export const UnifiedSchedulesProvider = ({ children }: { children: ReactNode }) => {
    const { draws, isLoading: drawsIsLoading } = useDraws();
    const [unifiedSchedules, setUnifiedSchedules] = useState<UnifiedSchedule[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(drawsIsLoading);
        if (!drawsIsLoading && draws.length > 0) {
            const allSchedules: UnifiedSchedule[] = [];

            draws.forEach(draw => {
                if (draw.sch && draw.sch.length > 0) {
                    draw.sch.forEach(scheduleTime => {
                        allSchedules.push({
                            drawId: draw.id,
                            drawName: draw.name,
                            schedule: scheduleTime,
                            logo: draw.logo,
                            cost: draw.cost,
                            cif: draw.cif,
                        });
                    });
                }
            });

            // Ordenar la lista unificada cronológicamente
            const sortedSchedules = [...allSchedules].sort((a, b) => {
                return parseTime(a.schedule) - parseTime(b.schedule);
            });

            setUnifiedSchedules(sortedSchedules);
            setIsLoading(false);
        }
    }, [draws, drawsIsLoading]);

    const value = {
        unifiedSchedules,
        isLoading,
    };

    return (
        <UnifiedSchedulesContext.Provider value={value}>
            {children}
        </UnifiedSchedulesContext.Provider>
    );
};