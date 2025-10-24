'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sale } from '@/contexts/SalesContext';
import Receipt from '@/components/sales/Receipt';
import { verifyTicket } from '../actions';

export default function VerificationResultPage() {
  const { ticketId } = useParams();
  const router = useRouter();
  const [sale, setSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof ticketId === 'string') {
      verifyTicket(ticketId).then(result => {
        if (result) {
          setSale(result);
          setIsValid(true);
        } else {
          setIsValid(false);
        }
        setIsLoading(false);
      });
    }
  }, [ticketId]);

  const handleGoBack = () => {
    router.push('/verificacion');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
        <p>Verificando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      {isValid === true && sale ? (
        <div className="w-full max-w-md p-8 space-y-4 bg-gray-800 rounded-lg shadow-lg text-center">
           <h2 className="text-2xl font-bold text-green-400">Comprobante Válido</h2>
           <Receipt sale={sale} drawName="Sorteo" onClose={handleGoBack} businessName="Lotto Hub" />
        </div>
       
      ) : (
        <div className="w-full max-w-md p-8 space-y-4 bg-red-800 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold text-white">Comprobante Inválido o Inexistente</h2>
          <p className="text-red-200">No se encontró ningún comprobante con el ID proporcionado.</p>
          <button
            onClick={handleGoBack}
            className="w-full mt-4 px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Verificar Otro Comprobante
          </button>
        </div>
      )}
    </div>
  );
}
