'use server';

import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

// Tipo para los datos de un nuevo resultado
type NewResultData = {
    drawId: string;
    drawName: string;
    schedule: string;
    winningNumbers: { "1ro": string; "2do": string; "3ro": string };
};

// Tipo para actualizar un resultado existente
type UpdateResultData = Partial<Omit<NewResultData, 'drawId' | 'drawName'> & { drawId: string; drawName: string }>;

/**
 * Server Action para añadir un nuevo resultado a la base de datos.
 * @param userId - El ID del usuario autenticado.
 * @param newResultData - Los datos del nuevo resultado.
 */
export async function addResult(userId: string, newResultData: NewResultData) {
    if (!userId) throw new Error("User not authenticated");

    const resultsCollectionRef = collection(db, 'users', userId, 'results');
    await addDoc(resultsCollectionRef, {
        ...newResultData,
        timestamp: serverTimestamp(),
    });
}

/**
 * Server Action para eliminar un resultado de la base de datos.
 * @param userId - El ID del usuario autenticado.
 * @param resultId - El ID del resultado a eliminar.
 */
export async function deleteResult(userId: string, resultId: string) {
    if (!userId) throw new Error("User not authenticated");

    const resultDocRef = doc(db, 'users', userId, 'results', resultId);
    await deleteDoc(resultDocRef);
}

/**
 * Server Action para actualizar un resultado existente.
 * @param userId - El ID del usuario autenticado.
 * @param resultId - El ID del resultado a actualizar.
 * @param updatedData - Los datos a actualizar en el resultado.
 */
export async function updateResult(userId: string, resultId: string, updatedData: UpdateResultData) {
    if (!userId) throw new Error("User not authenticated");

    const resultDocRef = doc(db, 'users', userId, 'results', resultId);
    await updateDoc(resultDocRef, updatedData);
}
