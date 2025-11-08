'use server';
import 'server-only';

import { adminDb } from '@/lib/firebase/admin';
import { Sale } from '@/contexts/SalesContext';
import { Timestamp } from 'firebase-admin/firestore';
import { headers } from 'next/headers';

// --- Lógica de Rate Limiting (en memoria) ---
const ipRequestStore = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT = 5;
const TIME_FRAME = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRequestStore.get(ip);

  if (!record) {
    ipRequestStore.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (now - record.timestamp > TIME_FRAME) {
    ipRequestStore.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}


// --- Lógica de la Base de Datos ---
interface SaleData extends Omit<Sale, 'timestamp'> {
  timestamp: Timestamp;
}

function normalizeTicketId(raw: string): string {
  return decodeURIComponent(String(raw).trim()).toUpperCase();
}

async function fetchSaleFromDatabase(ticketId: string): Promise<Sale | null> {
  const normalized = normalizeTicketId(ticketId);
  if (!normalized) return null;

  try {
    // 1) Buscar índice directo
    const idxRef = adminDb.collection('ticketIndex').doc(normalized);
    const idxSnap = await idxRef.get();
    if (!idxSnap.exists) return null;

    const { salePath } = idxSnap.data() as { salePath: string };
    if (!salePath || typeof salePath !== 'string') return null;

    // 2) Cargar la venta real desde salePath
    const saleSnap = await adminDb.doc(salePath).get();
    if (!saleSnap.exists) return null;

    const saleData = saleSnap.data() as SaleData;
    const sale: Sale = {
      ...saleData,
      timestamp: saleData.timestamp?.toDate?.().toISOString?.() ?? String(saleData.timestamp ?? '')
    };
    return sale;
  } catch (error) {
    console.error('Error al verificar ticket por índice:', error);
    return null;
  }
}

// --- Función Principal Exportada ---
export async function verifyTicket(ticketId: string): Promise<Sale | null> {
  const ip = headers().get('x-forwarded-for') ?? '127.0.0.1';
  const isAllowed = checkRateLimit(ip);

  if (!isAllowed) {
    console.warn(`Rate limit excedido para la IP: ${ip}`);
    return null;
  }

  const sale = await fetchSaleFromDatabase(ticketId);
  return sale;
}
