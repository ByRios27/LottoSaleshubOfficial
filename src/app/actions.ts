
'use server'

import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

// Tipo para una jugada individual (debe coincidir con el del cliente)
type Play = {
    drawId: string;
    drawName: string;
    number: string;
    amount: number;
}

// Tipo para el pedido completo
type Order = {
    plays: Play[];
    totalAmount: number;
}

/**
 * Guarda un nuevo pedido de lotería en Firestore.
 * @param order - El objeto del pedido que contiene las jugadas y el monto total.
 * @param userId - El ID del usuario que crea el pedido.
 */
export async function saveOrder(order: Order, userId: string) {
    if (!userId) {
        return { success: false, error: "Usuario no autenticado." };
    }

    if (!order || order.plays.length === 0) {
        return { success: false, error: "El pedido está vacío." };
    }

    try {
        const ordersCollectionRef = collection(db, 'users', userId, 'orders');
        
        // Añadimos información adicional al pedido antes de guardarlo
        const newOrder = {
            ...order,
            createdAt: Timestamp.now(),
            status: 'completed', // o 'pending', según el flujo de negocio
        };

        const docRef = await addDoc(ordersCollectionRef, newOrder);
        
        console.log("Pedido guardado con ID: ", docRef.id);
        return { success: true, orderId: docRef.id };

    } catch (error) {
        console.error("Error al guardar el pedido: ", error);
        // En un caso real, podrías querer manejar errores específicos
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: "Ocurrió un error desconocido." };
    }
}
