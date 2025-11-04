'use server';

import { adminDb } from '@/lib/firebase/admin';
import { Sale } from '@/contexts/SalesContext';
import { Timestamp } from 'firebase-admin/firestore';
import { headers } from 'next/headers';

// --- Lógica de Rate Limiting (en memoria) ---

// Almacén simple en memoria para rastrear las solicitudes por IP.
// En un entorno de producción a gran escala, se podría usar una solución más robusta como Redis.
const ipRequestStore = new Map<string, { count: number; timestamp: number }>();

const RATE_LIMIT = 5; // Máximo 5 solicitudes...
const TIME_FRAME = 60 * 1000; // ...por minuto.

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRequestStore.get(ip);

  if (!record) {
    ipRequestStore.set(ip, { count: 1, timestamp: now });
    return true;
  }

  // Si el último registro fue hace más de TIME_FRAME, reiniciar el conteo.
  if (now - record.timestamp > TIME_FRAME) {
    ipRequestStore.set(ip, { count: 1, timestamp: now });
    return true;
  }

  // Si el conteo supera el límite, bloquear la solicitud.
  if (record.count >= RATE_LIMIT) {
    return false;
  }

  // Incrementar el conteo y permitir la solicitud.
  record.count++;
  return true;
}

// --- Lógica de la Base de Datos ---

interface SaleData extends Omit<Sale, 'timestamp'> {
  timestamp: Timestamp;
}

async function fetchSaleFromDatabase(ticketId: string): Promise<Sale | null> {
  if (!ticketId || typeof ticketId !== 'string') {
    return null;
  }
  try {
    const saleRef = adminDb.collection('sales').doc(ticketId);
    const saleDoc = await saleRef.get();
    if (!saleDoc.exists) {
      console.log(`No se encontró el ticket con ID: ${ticketId}`);
      return null;
    }
    const saleData = saleDoc.data() as SaleData;
    const sale: Sale = {
      ...saleData,
      timestamp: saleData.timestamp.toDate().toISOString(),
    };
    return sale;
  } catch (error) {
    console.error("Error al verificar el ticket en Firestore:", error);
    return null;
  }
}

// --- Función Principal Exportada ---

export async function verifyTicket(ticketId: string): Promise<Sale | null> {
    // 1. Obtener la IP del cliente desde los encabezados.
    const ip = headers().get('x-forwarded-for') ?? '127.0.0.1';

    // 2. Verificar el límite de consultas para esa IP.
    const isAllowed = checkRateLimit(ip);

    if (!isAllowed) {
        console.warn(`Rate limit excedido para la IP: ${ip}`);
        // Retornamos null, el usuario simplemente verá "Ticket no encontrado".
        return null; 
    }

    // 3. Si se permite, proceder a buscar el ticket en la base de datos.
    const sale = await fetchSaleFromDatabase(ticketId);
    return sale;
}
