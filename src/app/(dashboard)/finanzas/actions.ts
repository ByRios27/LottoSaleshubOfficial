'use server';
import 'server-only';
import { adminDb } from '@/lib/firebase/admin';

/**
 * Elimina un lote de documentos de una consulta y sus correspondientes índices de tickets.
 * @param query La consulta de Firestore para obtener los documentos a eliminar.
 * @param batchSize El número de documentos a eliminar en este lote.
 * @returns El número de documentos eliminados.
 */
async function deleteQueryBatch(query: FirebaseFirestore.Query, batchSize: number) {
    const snapshot = await query.limit(batchSize).get();

    if (snapshot.size === 0) {
        return 0;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
        const saleData = doc.data();
        // Si la venta tiene un ticketId, también eliminamos su índice.
        if (saleData.ticketId) {
            const ticketId = String(saleData.ticketId).trim().toUpperCase();
            if (ticketId) {
                const ticketIndexRef = adminDb.collection('ticketIndex').doc(ticketId);
                batch.delete(ticketIndexRef);
            }
        }
        // Agregamos la venta actual al lote de eliminación.
        batch.delete(doc.ref);
    });
    await batch.commit();

    return snapshot.size;
}

/**
 * Elimina todas las ventas de un usuario específico, incluyendo los índices de tickets asociados.
 * La operación se realiza en lotes para evitar problemas de memoria y timeouts.
 * @param userId El ID del usuario para el que se eliminarán las ventas.
 */
export async function deleteAllSalesForUser(userId: string) {
    if (!userId) {
        console.error('Error: Se requiere userId para borrar las ventas.');
        throw new Error('Autenticación de usuario requerida.');
    }

    const salesCollectionRef = adminDb.collection(`users/${userId}/sales`);
    // Límite de operaciones por lote de Firestore es 500. Como eliminamos de 2 colecciones,
    // un tamaño de 250 es seguro. Usamos 100 para ser aún más cautelosos.
    const batchSize = 100; 

    try {
        let numDeleted;
        do {
            numDeleted = await deleteQueryBatch(salesCollectionRef, batchSize);
        } while (numDeleted > 0);
        
        console.log(`Todas las ventas y los índices de tickets para el usuario ${userId} han sido eliminados.`);
        return { success: true, message: 'Todas las ventas han sido eliminadas.' };

    } catch (error: any) {
        console.error(`🔥 Error borrando las ventas para el usuario ${userId}:`, {
            message: error?.message,
            stack: error?.stack,
        });
        // Relanzamos un error genérico para el cliente.
        throw new Error('Ocurrió un error al intentar eliminar las ventas.');
    }
}
