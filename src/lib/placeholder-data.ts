import type { Draw } from '@/contexts/DrawsContext';

// Datos Iniciales con horarios corregidos para Lotto Millonario
export const initialDraws: Draw[] = [
    { id: '1', name: 'Lotería de Jueves', cif: 2, cost: 1, sch: ['10:00 AM'] },
    { id: '2', name: 'Sorteo Especial', cif: 3, cost: 2, sch: ['03:00 PM', '09:00 PM'] },
    // CORREGIDO: Lotto Millonario ahora tiene los horarios correctos por defecto.
    { id: '3', name: 'Lotto Millonario', cif: 4, cost: 5, sch: ['01:00 PM', '04:00 PM', '07:00 PM', '10:00 PM'] },
    { id: '4', name: 'Triple Chance', cif: 2, cost: 0.5, sch: ['12:00 PM', '06:00 PM'] },
    { id: '5', name: 'Sorteo Zodiacal', cif: 2, cost: 1, sch: ['01:55 PM'] },
];
