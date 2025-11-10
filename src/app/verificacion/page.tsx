'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function VerificationPage() {
  const [ticketId, setTicketId] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Campo trampa
  const router = useRouter();

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader', 
      {
        qrbox: {
          width: 250,
          height: 250,
        },
        fps: 5,
      },
      false
    );

    let isScanning = false;

    function onScanSuccess(decodedText: string) {
      if (isScanning) return;
      isScanning = true;
      scanner.clear();
      router.push(`/verificacion/${decodedText}`);
    }

    function onScanFailure(error: any) {
      // console.warn(`Code scan error = ${error}`);
    }

    scanner.render(onScanSuccess, onScanFailure);

    return () => {
      scanner.clear().catch(error => {
        console.error("Failed to clear html5-qrcode-scanner.", error);
      });
    };
  }, [router]);

  const handleVerification = () => {
    // Si el campo trampa tiene un valor, es un bot. No hacer nada.
    if (honeypot) {
      return;
    }
    if (ticketId) {
      router.push(`/verificacion/${ticketId}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-white">Verificar Comprobante</h1>
        <p className="text-center text-gray-400">Ingresa el ID de tu ticket o escanea el código QR</p>
        <form onSubmit={(e) => { e.preventDefault(); handleVerification(); }} className="space-y-4">
          {/* Campo trampa (Honeypot) para engañar a los bots */}
          <div style={{ position: 'absolute', left: '-5000px' }} aria-hidden="true">
            <input type="text" name="extra_field" tabIndex={-1} value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </div>

          <label htmlFor="ticketId" className="sr-only">ID del Ticket</label>
          <input
            id="ticketId"
            type="text"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            placeholder="Ingresa el ID del Ticket"
            className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Verificar
          </button>
        </form>
        <div className="flex items-center justify-center">
          <span className="text-gray-400">o</span>
        </div>
        <div id="qr-reader" className="w-full"></div>
      </div>
    </div>
  );
}
