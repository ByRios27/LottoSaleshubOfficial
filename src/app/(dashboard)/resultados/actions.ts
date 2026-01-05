'use server';
import 'server-only';
import { adminDb } from '@/lib/firebase/admin';

async function deleteCollectionBatch(query: FirebaseFirestore.Query, batchSize: number) {
    const snapshot = await query.limit(batchSize).get();

    if (snapshot.size === 0) {
        return 0;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    return snapshot.size;
}

export async function deleteAllResultsForUser(userId: string) {
    if (!userId) {
        console.error('Error: Se requiere userId para borrar los resultados.');
        throw new Error('Autenticación de usuario requerida.');
    }

    const resultsCollectionRef = adminDb.collection(`users/${userId}/results`);
    const batchSize = 100;

    try {
        let numDeleted;
        do {
            numDeleted = await deleteCollectionBatch(resultsCollectionRef, batchSize);
        } while (numDeleted > 0);

        console.log(`Todos los resultados para el usuario ${userId} han sido eliminados.`);
        return { success: true, message: 'Todos los resultados han sido eliminados.' };

    } catch (error: any) {
        console.error(`🔥 Error borrando los resultados para el usuario ${userId}:`, {
            message: error?.message,
            stack: error?.stack,
        });
        throw new Error('Ocurrió un error al intentar eliminar los resultados.');
    }
}
