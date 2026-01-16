
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
    // Using a locale like 'sv-SE' provides the desired YYYY-MM-DD format.
    return new Intl.DateTimeFormat('sv-SE', options).format(date);
}

// --- Batch Deletion Functions ---
async function deleteQueryBatch(query: firestore.Query, resolve: (value?: any) => void, reject: (reason?: any) => void) {
    try {
        const snapshot = await query.get();
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

async function deleteCollection(collectionPath: string, batchSize: number = 50) {
    const collectionRef = adminDb.collection(collectionPath);
    const query = collectionRef.limit(batchSize);
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
        console.log(`Iniciando reseteo de datos para el usuario: ${userId}`);

        const salesPath = `users/${userId}/sales`;
        await deleteCollection(salesPath);
        console.log(`Colección de ventas eliminada para ${userId}`);

        const resultsPath = `users/${userId}/results`;
        await deleteCollection(resultsPath);
        console.log(`Colección de resultados eliminada para ${userId}`);

        const payoutsPath = `users/${userId}/payouts`;
        await deleteCollection(payoutsPath);
        console.log(`Colección de pagos (payouts) eliminada para ${userId}`);

        const dailyClosuresPath = `users/${userId}/dailyClosures`;
        await deleteCollection(dailyClosuresPath);
        console.log(`Colección de cierres diarios (dailyClosures) eliminada para ${userId}`);

        const ticketIndexQuery = adminDb.collection('ticketIndex').where('userId', '==', userId);
        await new Promise((resolve, reject) => {
            deleteQueryBatch(ticketIndexQuery, resolve, reject);
        });
        console.log(`Entradas de ticketIndex eliminadas para ${userId}`);

        return { success: true, message: "Todos los datos del día han sido eliminados." };

    } catch (error: any) {
        console.error('🔥 Error detallado en reseteo de datos:', { message: error?.message, stack: error?.stack, userId });
        throw new Error("Ocurrió un error durante el reseteo de los datos.");
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

