import 'server-only';
'use server';

import { adminDb } from '@/lib/firebase/admin';

export async function backfillTicketIndexOnce() {
  // IMPORTANTE: ejecutar SOLO en entorno controlado (desarrollo o con protección manual).
  // Recorre users/*/sales/* y crea ticketIndex si no existe.
  try {
    // Recorre usuarios (limitar si hay muchos)
    const usersSnap = await adminDb.collection('users').limit(500).get();
    for (const userDoc of usersSnap.docs) {
      const salesSnap = await adminDb.collection(`users/${userDoc.id}/sales`).limit(1000).get();
      for (const saleDoc of salesSnap.docs) {
        const data = saleDoc.data() as any;
        const ticketId = String(data?.ticketId ?? '').trim().toUpperCase();
        if (!ticketId) continue;

        const idxRef = adminDb.collection('ticketIndex').doc(ticketId);
        const idxSnap = await idxRef.get();
        if (!idxSnap.exists) {
          await idxRef.set({
            salePath: `users/${userDoc.id}/sales/${saleDoc.id}`,
            createdAt: new Date()
          });
        }
      }
    }
    return { ok: true };
  } catch (e) {
    console.error('[backfillTicketIndexOnce] error:', e);
    return { ok: false, error: String(e) };
  }
}
