'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sale } from '@/contexts/SalesContext';
import Receipt from '@/components/sales/Receipt';
import { verifyTicket } from '../actions';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';

export default function VerificationResultPage() {
  const params = useParams();
  const ticketId = params.ticketId as string; // <-- Corrección de tipo
  const router = useRouter();
  const [sale, setSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (ticketId) { // <-- Simplificado
      verifyTicket(ticketId).then(result => {
        if (result) {
          setSale(result);
          setIsValid(true);
        } else {
          setIsValid(false);
        }
        setIsLoading(false);
      }).catch(err => {
        console.error("Error verifying ticket:", err);
        setIsValid(false);
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
        <FaSpinner className="animate-spin text-4xl mb-4" />
        <p className="text-lg">Verificando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      {isValid === true && sale ? (
        <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-2xl shadow-xl text-center transition-transform transform hover:scale-105 duration-300">
           <div className="flex flex-col items-center">
            <FaCheckCircle className="text-5xl text-green-400 mb-4"/>
            <h2 className="text-3xl font-bold text-green-400">Comprobante Válido</h2>
           </div>
           <div className="border-t border-gray-700 pt-6">
            <Receipt sale={sale} drawName="Sorteo" onClose={handleGoBack} businessName="Lotto Hub" />
           </div>
        </div>
      ) : (
        <div className="w-full max-w-md p-8 space-y-6 bg-red-900/50 backdrop-blur-sm border border-red-700 rounded-2xl shadow-xl text-center transition-transform transform hover:scale-105 duration-300">
          <div className="flex flex-col items-center">
            <FaTimesCircle className="text-5xl text-red-400 mb-4"/>
            <h2 className="text-3xl font-bold text-red-300">Comprobante Inválido o Inexistente</h2>
          </div>
          <p className="text-red-200 text-lg">
            No se encontró ningún comprobante con el ID proporcionado o ya ha expirado.
          </p>
          <button
            onClick={handleGoBack}
            className="w-full mt-6 px-6 py-3 font-bold text-lg text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all duration-300"
          >
            Verificar Otro Comprobante
          </button>
        </div>
      )}
    </div>
  );
}
