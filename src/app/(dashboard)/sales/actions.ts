
'use server';
import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { Sale } from '@/contexts/SalesContext';
import { firestore } from 'firebase-admin';

// --- Funciones de borrado en lotes ---
async function deleteQueryBatch(query: firestore.Query, resolve: (value?: any) => void, reject: (reason?: any) => void) {
    try {
        const snapshot = await query.get();

        const batchSize = snapshot.size;
        if (batchSize === 0) {
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
    } catch(error) {
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

// --- Acción principal de reseteo ---
export async function resetDailyData(userId: string) {
    try {
        if (!userId) {
            throw new Error("User not authenticated for reset");
        }

        console.log(`Iniciando reseteo de datos para el usuario: ${userId}`);

        // 1. Borrar colección de ventas
        const salesPath = `users/${userId}/sales`;
        await deleteCollection(salesPath);
        console.log(`Colección de ventas eliminada para ${userId}`);

        // 2. Borrar colección de resultados
        const resultsPath = `users/${userId}/results`;
        await deleteCollection(resultsPath);
        console.log(`Colección de resultados eliminada para ${userId}`);

        // 3. Borrar entradas del índice de tickets
        const ticketIndexQuery = adminDb.collection('ticketIndex').where('userId', '==', userId);
        await new Promise((resolve, reject) => {
            deleteQueryBatch(ticketIndexQuery, resolve, reject);
        });
        console.log(`Entradas de ticketIndex eliminadas para ${userId}`);

        return { success: true, message: "Todos los datos del día han sido eliminados." };

    } catch (error: any) {
        console.error('🔥 Error detallado en reseteo de datos:', {
            message: error?.message,
            stack: error?.stack,
            userId,
        });
        throw new Error("Ocurrió un error durante el reseteo de los datos.");
    }
}

// --- Funciones existentes de ventas ---
type SaleData = Omit<Sale, 'id' | 'timestamp'> & {
    timestamp: firestore.FieldValue;
};

export async function createSaleWithIndex(
    userId: string,
    newSaleData: SaleData
) {
    try {
        if (!newSaleData || typeof newSaleData !== 'object') {
            throw new Error('Critical error: newSaleData is invalid.');
        }
        if (!userId) {
            throw new Error('User not authenticated');
        }

        const saleWithServerTimestamp = {
            ...newSaleData,
            timestamp: firestore.FieldValue.serverTimestamp(),
        };

        const salesCollectionRef = adminDb.collection(`users/${userId}/sales`);
        const newSaleRef = await salesCollectionRef.add(saleWithServerTimestamp);

        const ticketId = String(newSaleData.ticketId).trim().toUpperCase();
        if (!ticketId) {
             console.error('Venta creada pero no se pudo generar índice por ticketId vacío.', { saleId: newSaleRef.id });
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
        console.error('🔥 Error creando venta con índice:', { error, userId });
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
