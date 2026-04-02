
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { useDraws } from '@/contexts/DrawsContext';
import { useAuth } from '@/contexts/AuthContext';
import { saveOrder } from '@/app/actions';

type Play = {
    drawId: string;
    drawName: string;
    number: string;
    amount: number;
}
type Order = {
    plays: Play[];
    totalAmount: number;
}

export default function SalesModal() {
    const { draws, isLoading: isLoadingDraws } = useDraws();
    const { user } = useAuth();

    const [isSaving, startTransition] = useTransition();
    
    const [currentDraw, setCurrentDraw] = useState<string>("");
    const [currentNumber, setCurrentNumber] = useState("");
    const [currentAmount, setCurrentAmount] = useState("");
    const [order, setOrder] = useState<Order>({ plays: [], totalAmount: 0 });

    // EFECTO MEGA CORREGIDO: Dependencias ajustadas para evitar bucle infinito.
    useEffect(() => {
        // Si los sorteos ya cargaron, hay al menos uno, y no hemos seleccionado uno ya,
        // establece el primero de la lista como el sorteo por defecto.
        if (!isLoadingDraws && draws.length > 0 && !currentDraw) {
            setCurrentDraw(draws[0].id);
        }
    }, [draws, isLoadingDraws]); // <-- DEPENDENCIAS CORREGIDAS

    const resetForm = () => {
        setCurrentDraw(draws.length > 0 ? draws[0].id : "");
        setCurrentNumber("");
        setCurrentAmount("");
    };

    const handleAddPlay = () => {
        // Si no se ha seleccionado sorteo, usa el primero de la lista
        const drawId = currentDraw || (draws.length > 0 ? draws[0].id : "");
        if (!drawId) {
            alert("No hay sorteos disponibles.");
            return;
        }

        const draw = draws.find(d => d.id === drawId);
        if (!draw || !currentNumber || !currentAmount) {
            alert("Por favor, complete el número y el monto.");
            return;
        }
        const newPlay: Play = {
            drawId: draw.id,
            drawName: draw.name,
            number: currentNumber,
            amount: parseFloat(currentAmount),
        };
        setOrder(prevOrder => ({
            plays: [...prevOrder.plays, newPlay],
            totalAmount: prevOrder.totalAmount + newPlay.amount,
        }));
        resetForm();
    };

    const handleConfirmOrder = async () => {
        if (!user) {
            alert("Error: Usuario no encontrado.");
            return;
        }
        if (order.plays.length === 0) {
            alert("No hay jugadas en el pedido para confirmar.");
            return;
        }

        startTransition(async () => {
            const result = await saveOrder(order, user.uid);
            if (result.success) {
                alert(`¡Pedido guardado con éxito! ID: ${result.orderId}`);
                setOrder({ plays: [], totalAmount: 0 });
            } else {
                alert(`Error al guardar el pedido: ${result.error}`);
            }
        });
    };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <header className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">Crear Nuevo Pedido</h2>
        </header>

        <main className="p-6 flex-grow overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna Izquierda: Formulario */}
            <div className="flex flex-col space-y-4">
                <h3 className='text-lg font-semibold text-gray-800 dark:text-white'>Añadir Jugada</h3>
                <div>
                    <label htmlFor="draw-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sorteo</label>
                    {isLoadingDraws ? (
                        <div className="w-full h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
                    ) : (
                        <select 
                            id="draw-select"
                            value={currentDraw}
                            onChange={(e) => setCurrentDraw(e.target.value)}
                            disabled={isSaving || draws.length === 0}
                            className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
                        >
                            {draws.length === 0 ? (
                               <option value="" disabled>No hay sorteos disponibles</option>
                            ) : (
                                draws.map(draw => (
                                    <option key={draw.id} value={draw.id}>{draw.name}</option>
                                ))
                            )}
                        </select>
                    )}
                </div>
                <div>
                    <label htmlFor="number-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Número</label>
                    <input id="number-input" type="text" value={currentNumber} onChange={(e) => setCurrentNumber(e.target.value)} disabled={isSaving} className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50" placeholder='Ej: 24'/>
                </div>
                 <div>
                    <label htmlFor="amount-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto</label>
                    <input id="amount-input" type="number" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} disabled={isSaving} className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50" placeholder='Ej: 10'/>
                </div>
                <button onClick={handleAddPlay} disabled={isSaving} className="w-full px-6 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400">
                    + Añadir al Pedido
                </button>
            </div>

            {/* Columna Derecha: Resumen */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 flex flex-col">
                <h3 className='text-lg font-semibold text-gray-800 dark:text-white mb-4'>Resumen de Pedido</h3>
                <div className="flex-grow overflow-y-auto space-y-2">
                    {order.plays.length === 0 ? (
                        <p className="text-center text-gray-500">Aún no hay jugadas en el pedido.</p>
                    ) : (
                        order.plays.map((play, index) => (
                            <div key={index} className="flex justify-between items-center bg-white dark:bg-gray-700 p-2 rounded-md shadow-sm">
                                <div>
                                    <p className="font-bold text-gray-800 dark:text-white">{play.number}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{play.drawName}</p>
                                </div>
                                <p className="font-semibold text-gray-800 dark:text-white">C${play.amount.toFixed(2)}</p>
                            </div>
                        ))
                    )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center text-xl font-bold">
                        <span className="text-gray-800 dark:text-white">Total:</span>
                        <span className="text-purple-600">C${order.totalAmount.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </main>

        <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-4 bg-gray-50 dark:bg-gray-800/50">
            <button onClick={() => setOrder({ plays: [], totalAmount: 0 })} disabled={isSaving} className="px-6 py-2 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 dark:text-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 disabled:opacity-50">
                Cancelar
            </button>
            <button onClick={handleConfirmOrder} disabled={isSaving || order.plays.length === 0} className="px-6 py-2 rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed">
                {isSaving ? 'Guardando...' : 'Confirmar Pedido'}
            </button>
        </footer>
      </div>
    </div>
  );
}
