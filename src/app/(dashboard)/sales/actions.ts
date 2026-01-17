
'use server';
import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { Sale } from '@/contexts/SalesContext';
import { firestore } from 'firebase-admin';

// --- Helper Functions ---

/**
 * Gets the current date as a string in 'YYYY-MM-DD' format for the Dominican Republic timezone.
 * @returns {string} The formatted date string.
 */
function getDominicanDateString(): string {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/Santo_Domingo',
    };
    return new Intl.DateTimeFormat('sv-SE', options).format(date);
}

// --- Batch Deletion Functions ---

/**
 * Recursively deletes documents from a query in batches.
 */
async function deleteQueryBatch(query: firestore.Query, resolve: (value?: any) => void, reject: (reason?: any) => void) {
    try {
        const snapshot = await query.limit(100).get(); // Increased batch size for speed
        if (snapshot.size === 0) {
            resolve();
            return;
        }
        const batch = adminDb.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        process.nextTick(() => {
            deleteQueryBatch(query, resolve, reject);
        });
    } catch (error) {
        reject(error);
    }
}

/**
 * Deletes an entire collection or a query result.
 */
async function deleteCollection(collectionOrQuery: string | firestore.Query, batchSize: number = 100) {
    const query = typeof collectionOrQuery === 'string' 
        ? adminDb.collection(collectionOrQuery).limit(batchSize) 
        : collectionOrQuery;
    
    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, resolve, reject);
    });
}

// --- Main Data Reset Action ---

export async function resetDailyData(userId: string) {
    try {
        if (!userId) {
            throw new Error("User not authenticated for reset");
        }
        console.log(`ADVERTENCIA: Iniciando borrado COMPLETO de datos para el usuario: ${userId}`);

        // Define paths for collections to be entirely deleted
        const collectionsToDelete = [
            `users/${userId}/sales`,
            `users/${userId}/results`,
            `users/${userId}/winners`,
            `users/${userId}/payoutStatus`,
            `users/${userId}/dailyClosures`
        ];

        // Define the query for user-specific documents in the root ticketIndex collection
        const ticketIndexQuery = adminDb.collection('ticketIndex').where('userId', '==', userId);

        // Create a list of deletion promises
        const deletionPromises = collectionsToDelete.map(path => 
            deleteCollection(path).then(() => console.log(`Colección ${path} eliminada.`))
        );

        // Add the promise for deleting ticketIndex entries
        deletionPromises.push(
            deleteCollection(ticketIndexQuery).then(() => console.log(`Entradas de ticketIndex eliminadas para ${userId}.`))
        );

        // Execute all deletions in parallel
        await Promise.all(deletionPromises);

        console.log(`Reseteo completo de datos finalizado para el usuario: ${userId}`);
        return { success: true, message: "Todas las colecciones de datos han sido eliminadas." };

    } catch (error: any) {
        console.error('🔥 Error detallado en reseteo de datos masivo:', { 
            message: error?.message, 
            stack: error?.stack, 
            userId 
        });
        throw new Error("Ocurrió un error catastrófico durante el reseteo de los datos.");
    }
}


// --- Sale Management Actions ---
type SaleData = Omit<Sale, 'id' | 'timestamp'> & {
    timestamp: firestore.FieldValue;
};

export async function createSaleWithIndex(userId: string, newSaleData: SaleData) {
    try {
        if (!newSaleData || typeof newSaleData !== 'object') {
            throw new Error('Critical error: newSaleData is invalid.');
        }
        if (!userId) {
            throw new Error('User not authenticated');
        }

        // --- BLOCK SALE IF DRAW IS CLOSED ---
        if (newSaleData.schedules && newSaleData.schedules.length > 0) {
            const today = getDominicanDateString();
            const resultsRef = adminDb.collection(`users/${userId}/results`);
            const resultsQuery = resultsRef
                .where('drawId', '==', newSaleData.drawId)
                .where('schedule', 'in', newSaleData.schedules)
                .where('date', '==', today);

            const existingResultsSnapshot = await resultsQuery.get();

            if (!existingResultsSnapshot.empty) {
                const closedSchedule = existingResultsSnapshot.docs[0].data().schedule;
                throw new Error(`El sorteo (${newSaleData.drawName}) para el horario de las ${closedSchedule} ya ha cerrado hoy.`);
            }
        }
        // --- END VALIDATION ---

        const saleWithServerTimestamp = {
            ...newSaleData,
            timestamp: firestore.FieldValue.serverTimestamp(),
        };

        const salesCollectionRef = adminDb.collection(`users/${userId}/sales`);
        const newSaleRef = await salesCollectionRef.add(saleWithServerTimestamp);

        const ticketId = String(newSaleData.ticketId).trim().toUpperCase();
        if (!ticketId) {
            console.warn('Venta creada pero no se pudo generar índice por ticketId vacío.', { saleId: newSaleRef.id });
            return { saleId: newSaleRef.id };
        }

        const ticketIndexRef = adminDb.collection('ticketIndex').doc(ticketId);
        await ticketIndexRef.set({
            salePath: newSaleRef.path,
            userId: userId,
            createdAt: firestore.FieldValue.serverTimestamp()
        });

        return { saleId: newSaleRef.id };

    } catch (error: any) {
        if (error.message.includes("ya ha cerrado hoy")) {
            throw error; // Re-throw validation error to be caught by the client
        }
        console.error('🔥 Error creando venta con índice:', {
            errorMessage: error.message,
            errorStack: error.stack,
            userId,
        });
        throw new Error('No se pudo crear la venta. Por favor, intente de nuevo.');
    }
}

export async function updateSaleWithIndex(userId: string, saleId: string, updatedData: Partial<SaleData>) {
    try {
        if (!userId || !saleId || !updatedData) {
            throw new Error('Faltan parámetros para actualizar la venta.');
        }
        const saleDocRef = adminDb.collection(`users/${userId}/sales`).doc(saleId);
        const dataToUpdate = {
            ...updatedData,
            timestamp: firestore.FieldValue.serverTimestamp()
        };
        await saleDocRef.update(dataToUpdate);
        return { success: true };
    } catch (error: any) {
        console.error('🔥 Error actualizando venta:', { error, userId, saleId });
        throw error;
    }
}
