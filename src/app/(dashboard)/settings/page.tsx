'use client';

import { useDraws } from '@/contexts/DrawsContext';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { resetDraws, isLoading } = useDraws();

  const handleReset = async () => {
    try {
      await resetDraws();
    } catch (error) {
      // El error ya se maneja y se notifica dentro de la función resetDraws
      console.error("Failed to reset draws from settings page:", error);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-white">
      <h1 className="text-2xl font-bold mb-4">Configuración</h1>
      <p className="text-gray-400 mb-8">Ajustes y controles generales de la aplicación.</p>

      {/* --- Zona de Peligro --- */}
      <div className="mt-12 p-6 bg-red-900/20 border border-red-500/30 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-red-400" aria-hidden="true" />
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-bold text-red-300">Zona de Peligro</h2>
            <p className="mt-2 text-gray-300">
              Las acciones en esta sección son destructivas y no se pueden deshacer. Úsalas con precaución.
            </p>
          </div>
        </div>

        {/* Acción de Resetear Sorteos */}
        <div className="mt-6 border-t border-red-500/30 pt-6">
            <div className="md:flex md:items-center md:justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">Restaurar Sorteos de Fábrica</h3>
                    <p className="mt-1 text-sm text-gray-400">
                        Esto eliminará todos los sorteos actuales y los reemplazará con la lista completa y actualizada (Nica, Honduras, etc.).
                    </p>
                </div>
                <div className="mt-4 md:mt-0 md:ml-6">
                    <button
                        onClick={handleReset}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RotateCw className={`-ml-1 mr-2 h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                        {isLoading ? 'Reiniciando...' : 'Resetear Sorteos'}
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
