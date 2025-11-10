'use server';
import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { firestore } from 'firebase-admin';

// --- Tipos de Datos del Servidor ---
// Definimos la estructura de los datos que esperamos del cliente.
// Esto desacopla el archivo del servidor de cualquier archivo de cliente.
interface ClientSaleNumber {
    number: string;
    quantity: number;
}

interface ClientSaleData {
    ticketId: string;
    drawId: string;
    drawName: string;
    schedules: string[];
    numbers: ClientSaleNumber[];
    sellerId: string;
    costPerFraction: number;
    totalCost: number;
    receiptUrl: string;
    clientName?: string;
    clientPhone?: string;
    drawLogo?: string;
}

export async function createSaleWithIndex(
    userId: string,
    newSaleData: ClientSaleData
) {
    if (!userId) {
        return { error: 'User not authenticated to create sale' };
    }

    try {
        const saleToCreate = {
            ...newSaleData,
            timestamp: firestore.FieldValue.serverTimestamp(),
            sellerId: userId, // Sobrescribimos para seguridad
        };

        const salesCollectionRef = adminDb.collection(`users/${userId}/sales`);
        const newSaleRef = await salesCollectionRef.add(saleToCreate);

        const ticketId = String(newSaleData.ticketId).trim().toUpperCase();
        if (!ticketId) {
            console.warn(`Alerta: Venta ${newSaleRef.id} creada sin ticketId válido. Índice no creado.`);
            return { saleId: newSaleRef.id };
        }

        const ticketIndexRef = adminDb.collection('ticketIndex').doc(ticketId);
        await ticketIndexRef.set({
            salePath: newSaleRef.path,
            createdAt: firestore.FieldValue.serverTimestamp()
        });

        console.log(`Venta e índice creados: SaleID: ${newSaleRef.id}, TicketID: ${ticketId}`);
        
        return { saleId: newSaleRef.id };

    } catch (error) {
        console.error('Error catastrófico al crear venta e índice:', error);
        if (error instanceof Error) {
            return { error: `Server error: ${error.message}` };
        }
        return { error: 'An unknown server error occurred.' };
    }
}
