'use client';

import { useState } from 'react';
import { useDraws, type Draw } from '@/contexts/DrawsContext';
import { useBusiness } from '@/contexts/BusinessContext';
import Link from 'next/link';
import Image from "next/image";
import { TicketIcon, PhotoIcon } from '@heroicons/react/24/outline';
import SalesModal from '@/components/sales/SalesModal';
import { SalesProvider } from '@/contexts/SalesContext'; // 1. Importar el proveedor

// 2. El contenido de la página se convierte en un componente interno
function SalesPageContent() {
  const { draws } = useDraws();
  const { businessName, businessLogo } = useBusiness();
  const [selectedDraw, setSelectedDraw] = useState<Draw | null>(null);

  return (
    <>
      <div className="min-h-screen text-white p-4 sm:p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          {draws.length > 0 ? (
              <div className="bg-white/5 backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-lg border border-white/10">
                  <h2 className="text-2xl font-semibold mb-6 text-center">Selecciona un Sorteo</h2>
                  <div className="flex flex-wrap justify-center gap-8">
                      {draws.map(draw => (
                          <button key={draw.id} onClick={() => setSelectedDraw(draw)} className="block group text-center transform transition-transform duration-200 hover:scale-110">
                              <div className="w-24 h-24 mx-auto mb-3 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 border-2 border-white/20 group-hover:border-green-500/80 transition-colors duration-300 overflow-hidden relative">
                                  {draw.logo ? (
                                      <Image
                                        src={draw.logo}
                                        alt={draw.name}
                                        fill
                                        sizes="96px"
                                        className="object-cover" />
                                  ) : (
                                      <PhotoIcon className="w-12 h-12 text-white/50 group-hover:text-green-400 transition-colors duration-300"/>
                                  )}
                              </div>
                              <h3 className="font-medium text-base text-white">{draw.name}</h3>
                          </button>
                      ))}
                  </div>
              </div>
          ) : (
              <div className="flex flex-col items-center justify-center h-[60vh]">
                <div className="text-center py-12 px-8 bg-white/5 rounded-2xl border-2 border-dashed border-white/20 max-w-md">
                    <TicketIcon className="w-16 h-16 mx-auto text-white/40 mb-4" />
                    <h3 className="text-xl font-semibold text-white">No hay sorteos disponibles</h3>
                    <p className="text-white/60 mt-2">Para empezar a vender, primero necesitas crear un sorteo.</p>
                    <Link href="/draws" className="mt-6 inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg">
                        Crear mi Primer Sorteo
                    </Link>
                </div>
              </div>
          )}
        </div>
      </div>
      {selectedDraw && (
        <SalesModal 
          draw={selectedDraw} 
          businessName={businessName}
          logoUrl={businessLogo}
          onClose={() => setSelectedDraw(null)} 
        />
      )}
    </>
  );
}

// 3. El componente exportado ahora es un "wrapper" que provee el contexto
export default function SalesPage() {
  return (
    <SalesProvider>
      <SalesPageContent />
    </SalesProvider>
  );
}
