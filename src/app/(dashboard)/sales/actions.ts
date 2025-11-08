
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
    if (!userId) {
        throw new Error('User not authenticated to create sale');
    }

    const saleWithServerTimestamp = {
        ...newSaleData,
        timestamp: firestore.FieldValue.serverTimestamp(),
    };

    const salesCollectionRef = adminDb.collection(`users/${userId}/sales`);
    
    // Usamos .add() para que Firestore genere un ID de documento único
    const newSaleRef = await salesCollectionRef.add(saleWithServerTimestamp);
    
    // Normalizamos el ticketId a MAYÚSCULAS
    const ticketId = String(newSaleData.ticketId).trim().toUpperCase();

    if (!ticketId) {
        // En un caso real, podríamos querer revertir la venta o registrar el error
        console.error('Error: La venta se creó sin ticketId. No se puede crear el índice.', newSaleRef.id);
        // Devolvemos el ID de la venta creada, aunque el índice falló.
        return { saleId: newSaleRef.id };
    }

    // Crear el índice con el path a la venta recién creada
    const ticketIndexRef = adminDb.collection('ticketIndex').doc(ticketId);
    await ticketIndexRef.set({
        salePath: newSaleRef.path,
        createdAt: firestore.FieldValue.serverTimestamp()
    });

    console.log(`Venta e índice creados. SaleID: ${newSaleRef.id}, TicketID: ${ticketId}`);
    
    return { saleId: newSaleRef.id };
}
