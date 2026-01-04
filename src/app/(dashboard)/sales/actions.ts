
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
    try {
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
        console.error('🔥 Error detallado creando venta con índice:', {
            message: error?.message,
            name: error?.name,
            stack: error?.stack,
            userId,
            ticketId: newSaleData?.ticketId,
            error,
        });
        throw error;
    }
}

export async function updateSaleWithIndex(
    userId: string,
    saleId: string,
    updatedData: Partial<SaleData>
) {
    try {
        if (!userId || !saleId || !updatedData) {
            throw new Error('Faltan parámetros para actualizar la venta.');
        }

        const saleDocRef = adminDb.collection(`users/${userId}/sales`).doc(saleId);
        
        const dataWithTimestamp = {
            ...updatedData,
            updatedAt: firestore.FieldValue.serverTimestamp()
        };

        await saleDocRef.update(dataWithTimestamp);

        console.log(`Venta actualizada. SaleID: ${saleId}`);

        // Opcional: si el ticketId puede cambiar, también se debe actualizar el índice.
        // Esto es más complejo ya que implica borrar el índice antiguo y crear uno nuevo.
        // Por ahora, asumimos que ticketId no cambia en una edición.

        return { success: true };
    } catch (error: any) {
        console.error('🔥 Error detallado actualizando venta:', {
            message: error?.message,
            name: error?.name,
            stack: error?.stack,
            userId,
            saleId,
            updatedData,
            error,
        });
        throw error;
    }
}
