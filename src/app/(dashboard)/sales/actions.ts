
'use server';
import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { Sale } from '@/contexts/SalesContext';
import { firestore } from 'firebase-admin';

type SaleData = Omit<Sale, 'id' | 'timestamp'> & {
    timestamp: firestore.FieldValue;
};

export async function createSaleWithIndex(
    userId: string,
    newSaleData: SaleData
) {
    // PASO 2: Envolver en un bloque try/catch detallado
    try {
        // PASO 4: Validación defensiva
        if (!newSaleData || typeof newSaleData !== 'object') {
            console.error('⚠️ createSaleWithIndex fue llamado con newSaleData nulo, undefined, o no es un objeto.', { userId, newSaleData });
            throw new Error('Critical error: newSaleData is invalid.');
        }

        if (!userId) {
            throw new Error('User not authenticated to create sale');
        }

        const saleWithServerTimestamp = {
            ...newSaleData,
            timestamp: firestore.FieldValue.serverTimestamp(),
        };

        const salesCollectionRef = adminDb.collection(`users/${userId}/sales`);
        
        const newSaleRef = await salesCollectionRef.add(saleWithServerTimestamp);
        
        // PASO 4: Validación defensiva para ticketId
        if (!newSaleData.ticketId) {
            console.error('Error: La venta se creó pero newSaleData.ticketId viene vacío. No se puede crear el índice.', {
                saleId: newSaleRef.id,
                newSaleData,
            });
            return { saleId: newSaleRef.id };
        }
        
        const ticketId = String(newSaleData.ticketId).trim().toUpperCase();

        if (!ticketId) {
            console.error('Error: La venta se creó pero el ticketId resultó en una cadena vacía después de procesar. No se puede crear el índice.', {
                 saleId: newSaleRef.id,
                 originalTicketId: newSaleData.ticketId
            });
            return { saleId: newSaleRef.id };
        }

        const ticketIndexRef = adminDb.collection('ticketIndex').doc(ticketId);
        await ticketIndexRef.set({
            salePath: newSaleRef.path,
            createdAt: firestore.FieldValue.serverTimestamp()
        });

        console.log(`Venta e índice creados. SaleID: ${newSaleRef.id}, TicketID: ${ticketId}`);
        
        return { saleId: newSaleRef.id };
    } catch (error: any) {
        // PASO 2 y 7: Loguear el error DETALLADO en el servidor antes de relanzarlo
        console.error('🔥 Error detallado creando venta con índice:', {
            message: error?.message,
            name: error?.name,
            stack: error?.stack,
            // Contexto adicional
            userId,
            ticketId: newSaleData?.ticketId,
            // El objeto de error completo
            error,
        });

        // Re-lanzar el error para que el flujo del cliente no cambie
        // Esto producirá el error 500 que el usuario ve, pero ahora tendremos el log del servidor.
        throw error;
    }
}
