'use client';
import { useState, useMemo } from 'react';
import { useDraws } from '@/contexts/DrawsContext';
import { useResults, Result, Winner, Sale } from '@/contexts/ResultsContext';
import { themes } from '@/lib/themes';
import { FiUpload, FiTrash2, FiChevronDown, FiCheckCircle, FiAlertTriangle, FiEdit } from 'react-icons/fi';
import { EyeIcon } from '@heroicons/react/24/outline';
import { useBusiness } from '@/contexts/BusinessContext';
import { toast } from 'sonner';
import Receipt from '@/components/sales/Receipt';

export default function Resultados() {
  const { theme, businessName, businessLogo } = useBusiness();
  const { draws } = useDraws();
  const { results, addResult, deleteResult, updateResult, isLoading: isLoadingResults, winners, allSales } = useResults();

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [saleForReceipt, setSaleForReceipt] = useState<Sale | null>(null);
  
  const selectedTheme = themes.find(t => t.name === theme) || themes[0];
  const themeStyles = selectedTheme.styles;

  const [selectedDrawId, setSelectedDrawId] = useState<string>('');
  const [selectedSchedule, setSelectedSchedule] = useState<string>('');
  const [prizeNumbers, setPrizeNumbers] = useState({ '1ro': '', '2do': '', '3ro': '' });

  const [resultToDelete, setResultToDelete] = useState<Result | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<Winner | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [resultToEdit, setResultToEdit] = useState<Result | null>(null);
  const [editNumbers, setEditNumbers] = useState({ '1ro': '', '2do': '', '3ro': '' });

  const [paidWinners, setPaidWinners] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    const saved = localStorage.getItem('paid-winners');
    return saved ? JSON.parse(saved) : {};
  });

  const handleShowReceipt = (ticketId: string) => {
    const saleDetail = allSales.find(s => s.ticketId === ticketId);
    if (saleDetail) {
      setSaleForReceipt(saleDetail);
      setIsReceiptModalOpen(true);
    } else {
      toast.error('No se encontraron los detalles de la venta para este ticket.');
    }
  };

  const handleDrawChange = (drawId: string) => {
    setSelectedDrawId(drawId);
    setSelectedSchedule('');
    setPrizeNumbers({ '1ro': '', '2do': '', '3ro': '' });
  };

  const selectedDraw = useMemo(() => draws.find(d => d.id === selectedDrawId), [selectedDrawId, draws]);
  const availableSchedules = useMemo(() => selectedDraw ? selectedDraw.sch : [], [selectedDraw]);

  const handlePrizeNumberChange = (prize: '1ro' | '2do' | '3ro', value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (selectedDraw && numericValue.length <= selectedDraw.cif) {
      setPrizeNumbers(prev => ({ ...prev, [prize]: numericValue }));
    }
  };

  const handleRegister = () => {
    if (!isFormValid || !selectedDraw) return;
    const newResult = { drawId: selectedDraw.id, drawName: selectedDraw.name, schedule: selectedSchedule, winningNumbers: prizeNumbers };
    addResult(newResult);
    toast.success(`Resultados para ${selectedDraw.name} registrados.`);
    setSelectedDrawId('');
    setSelectedSchedule('');
    setPrizeNumbers({ '1ro': '', '2do': '', '3ro': '' });
  };

  const handleOpenPayModal = (winner: Winner) => {
    setSelectedWinner(winner);
    setIsPayModalOpen(true);
  };

  const handleConfirmPayment = () => {
    if (selectedWinner) {
      const winnerId = `${selectedWinner.ticketId}-${selectedWinner.play.number}-${selectedWinner.prize}`;
      const updatedPaidWinners = { ...paidWinners, [winnerId]: true };
      setPaidWinners(updatedPaidWinners);
      localStorage.setItem('paid-winners', JSON.stringify(updatedPaidWinners));
      toast.success(`Ganador del ticket ${selectedWinner.ticketId} marcado como pagado.`);
      setIsPayModalOpen(false);
      setSelectedWinner(null);
    }
  };

  const handleRequestDelete = (result: Result) => {
    setResultToDelete(result);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (resultToDelete) {
      deleteResult(resultToDelete.id);
      toast.success(`Resultado para ${resultToDelete.drawName} eliminado.`);
      setIsDeleteModalOpen(false);
      setResultToDelete(null);
    }
  };
  
  const handleRequestEdit = (result: Result) => {
    setResultToEdit(result);
    setEditNumbers(result.winningNumbers);
    setIsEditModalOpen(true);
  };

  const handleEditNumberChange = (prize: '1ro' | '2do' | '3ro', value: string) => {
    const drawForEditedResult = draws.find(d => d.id === resultToEdit?.drawId);
    const numericValue = value.replace(/[^0-9]/g, '');
    if (drawForEditedResult && numericValue.length <= drawForEditedResult.cif) {
        setEditNumbers(prev => ({ ...prev, [prize]: numericValue }));
    }
  };

  const handleConfirmUpdate = () => {
    if (resultToEdit) {
      updateResult(resultToEdit.id, { winningNumbers: editNumbers });
      toast.success(`Resultados para ${resultToEdit.drawName} actualizados.`);
      setIsEditModalOpen(false);
      setResultToEdit(null);
    }
  };

  const isFormValid = useMemo(() => {
    if (!selectedDraw || !selectedSchedule) return false;
    const requiredDigits = selectedDraw.cif;
    const hasAllNumbers = prizeNumbers['1ro'] && prizeNumbers['2do'] && prizeNumbers['3ro'];
    if (!hasAllNumbers) return false;
    return Object.values(prizeNumbers).every(num => num.length === requiredDigits);
  }, [selectedDraw, selectedSchedule, prizeNumbers]);

  const groupedResults = useMemo(() => {
    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .reduce((acc, result) => {
        const date = new Date(result.timestamp).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
        if (!acc[date]) acc[date] = [];
        acc[date].push(result);
        return acc;
    }, {} as Record<string, Result[]>);
  }, [results]);

  const processedWinners = useMemo(() => {
      return winners.map(winner => ({
          ...winner,
          id: `${winner.ticketId}-${winner.play.number}-${winner.prize}`,
          paid: !!paidWinners[`${winner.ticketId}-${winner.play.number}-${winner.prize}`]
      })).sort((a, b) => (a.paid === b.paid) ? 0 : a.paid ? 1 : -1);
  }, [winners, paidWinners]);

  return (
    <div className={`min-h-screen p-6 ${themeStyles.backgroundImage}`}>
      <div className={`max-w-6xl mx-auto rounded-2xl shadow-lg p-6 space-y-10 ${themeStyles.glassClasses}`}>

        <section className="space-y-6">
          <h2 className={`text-2xl font-semibold border-b pb-2 ${themeStyles.textPrimary} border-white/10`}>
            Registrar Nuevo Resultado
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="md:col-span-1">
              <label className={`block text-sm font-medium mb-1 ${themeStyles.textSecondary}`}>Sorteo</label>
              <div className="relative">
                <select className={`w-full border rounded-lg p-2 pr-8 outline-none appearance-none font-medium bg-white/10 text-white border-white/20`} value={selectedDrawId} onChange={(e) => handleDrawChange(e.target.value)}>
                  <option value="">Seleccionar sorteo</option>
                  {draws.map(draw => <option key={draw.id} value={draw.id}>{draw.name}</option>)}
                </select>
                <FiChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none text-gray-500`} />
              </div>
            </div>
            <div className="md:col-span-1">
              <label className={`block text-sm font-medium mb-1 ${themeStyles.textSecondary}`}>Horario</label>
              <div className="relative">
                <select className={`w-full border rounded-lg p-2 pr-8 outline-none appearance-none font-medium bg-white/10 text-white border-white/20`} value={selectedSchedule} onChange={(e) => setSelectedSchedule(e.target.value)} disabled={!selectedDrawId}>
                  <option value="">Seleccionar horario</option>
                  {availableSchedules.map(schedule => <option key={schedule} value={schedule}>{schedule}</option>)}
                </select>
                <FiChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none text-gray-500`} />
              </div>
            </div>
            <div className="md:col-span-1">
              <label className={`block text-sm font-medium mb-1 ${themeStyles.textSecondary}`}>
                Números Ganadores ({selectedDraw?.cif || 'N/A'} cifras)
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-center">
                    <span className="text-xs text-white">1ro</span>
                    <input type="text" inputMode="numeric" className={`w-full border rounded-lg p-2 text-center outline-none bg-white/10 text-white border-white/20 font-medium`} value={prizeNumbers['1ro']} onChange={(e) => handlePrizeNumberChange('1ro', e.target.value)} maxLength={selectedDraw?.cif} disabled={!selectedDrawId} />
                </div>
                <div className="flex-1 text-center">
                    <span className="text-xs text-white">2do</span>
                    <input type="text" inputMode="numeric" className={`w-full border rounded-lg p-2 text-center outline-none bg-white/10 text-white border-white/20 font-medium`} value={prizeNumbers['2do']} onChange={(e) => handlePrizeNumberChange('2do', e.target.value)} maxLength={selectedDraw?.cif} disabled={!selectedDrawId} />
                </div>
                <div className="flex-1 text-center">
                    <span className="text-xs text-white">3ro</span>
                    <input type="text" inputMode="numeric" className={`w-full border rounded-lg p-2 text-center outline-none bg-white/10 text-white border-white/20 font-medium`} value={prizeNumbers['3ro']} onChange={(e) => handlePrizeNumberChange('3ro', e.target.value)} maxLength={selectedDraw?.cif} disabled={!selectedDrawId} />
                </div>
              </div>
            </div>
            <div className="md:col-span-1">
                <button onClick={handleRegister} disabled={!isFormValid} className={`w-full px-4 py-2 rounded-md font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 ease-in-out bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed`}>
                    <FiUpload />
                    Registrar
                </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
            <h2 className={`text-2xl font-semibold border-b pb-2 ${themeStyles.textPrimary} border-white/10`}>
                Últimos Resultados Registrados
            </h2>
            {isLoadingResults ? (
                 <p className={themeStyles.textSecondary}>Cargando resultados...</p>
            ) : Object.keys(groupedResults).length > 0 ? (
                <div className="space-y-6">
                    {Object.entries(groupedResults).map(([date, resultsForDate]) => (
                        <div key={date}>
                            <h3 className={`font-semibold text-lg mb-2 ${themeStyles.textPrimary}`}>{date}</h3>
                            <div className="overflow-x-auto rounded-lg border border-white/10">
                                <table className={`w-full text-left ${themeStyles.textSecondary}`}>
                                    <thead className={`bg-white/5`}>
                                        <tr className={`border-b border-white/10`}>
                                            <th className="py-2 px-3 text-sm">Sorteo</th>
                                            <th className="py-2 px-3 text-sm">Horario</th>
                                            <th className="py-2 px-3 text-sm text-center">1ro</th>
                                            <th className="py-2 px-3 text-sm text-center">2do</th>
                                            <th className="py-2 px-3 text-sm text-center">3ro</th>
                                            <th className="py-2 px-3 text-sm text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {resultsForDate.map(result => (
                                            <tr key={result.id} className={`border-t hover:bg-white/5 border-white/10`}>
                                                <td className={`py-2 px-3 text-sm font-semibold ${themeStyles.textPrimary}`}>{result.drawName}</td>
                                                <td className="py-2 px-3 text-sm">{result.schedule}</td>
                                                <td className={`py-2 px-3 text-sm text-center font-bold text-green-400`}>{result.winningNumbers['1ro']}</td>
                                                <td className={`py-2 px-3 text-sm text-center font-bold text-green-400`}>{result.winningNumbers['2do']}</td>
                                                <td className={`py-2 px-3 text-sm text-center font-bold text-green-400`}>{result.winningNumbers['3ro']}</td>
                                                <td className="py-2 px-3 text-sm text-center">
                                                    <button onClick={() => handleRequestEdit(result)} className={`p-1.5 rounded-full hover:bg-blue-500/20 text-blue-500 transition-colors mr-2`}>
                                                        <FiEdit size={16}/>
                                                    </button>
                                                    <button onClick={() => handleRequestDelete(result)} className={`p-1.5 rounded-full hover:bg-red-500/20 text-red-500 transition-colors`}>
                                                        <FiTrash2 size={16}/>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className={themeStyles.textSecondary}>No hay resultados registrados todavía.</p>
            )}
        </section>

        <section className="space-y-4">
            <h2 className={`text-2xl font-semibold border-b pb-2 ${themeStyles.textPrimary} border-white/10`}>
                🏆 Ganadores
            </h2>
            <div className="overflow-x-auto">
                <table className={`w-full text-left ${themeStyles.textSecondary}`}>
                    <thead>
                        <tr className={`border-b border-white/10`}>
                            <th className="py-2 px-3 text-sm">Ticket ID</th>
                            <th className="py-2 px-3 text-sm">Nombre</th>
                            <th className="py-2 px-3 text-sm">Sorteo</th>
                            <th className="py-2 px-3 text-sm">Número</th>
                            <th className="py-2 px-3 text-sm">Lugar del premio</th>
                            <th className="py-2 px-3 text-sm text-center">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedWinners.length > 0 ? processedWinners.map((winner) => (
                            <tr key={winner.id} className={`hover:bg-white/5 ${winner.paid ? 'opacity-50' : ''}`}>
                                <td className={`py-2 px-3 text-sm font-mono ${themeStyles.textSecondary}`}>{winner.ticketId}</td>
                                <td className={`py-2 px-3 text-sm font-semibold ${themeStyles.textPrimary}`}>{winner.clientName}</td>
                                <td className="py-2 px-3 text-sm">{winner.drawName} ({winner.schedule})</td>
                                <td className={`py-2 px-3 text-sm font-bold text-green-400`}>{winner.play.number}</td>
                                <td className="py-2 px-3 text-sm font-semibold">{winner.prize}</td>
                                <td className="py-2 px-3 text-sm text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => !winner.paid && handleOpenPayModal(winner)}
                                            disabled={winner.paid}
                                            className={`px-3 py-1 rounded-md font-semibold text-xs transition-transform duration-200 ease-in-out transform hover:scale-105 
                                                ${winner.paid
                                                ? 'bg-gray-600 text-white/70 cursor-not-allowed inline-flex items-center gap-1.5' 
                                                : 'bg-green-500 text-white'}`}>
                                            {winner.paid ? <><FiCheckCircle /> Pagado</> : 'Pagar'}
                                        </button>
                                        <button onClick={() => handleShowReceipt(winner.ticketId)} className="p-1.5 rounded-full hover:bg-blue-500/20 text-blue-500 transition-colors">
                                            <EyeIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={6} className={`py-4 text-center ${themeStyles.textSecondary}`}>No se han encontrado ganadores. Registra resultados para verificar.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>

      </div>

      {isPayModalOpen && selectedWinner && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl p-8 space-y-6 w-full max-w-md border border-gray-700 shadow-xl">
            <h3 className="text-xl font-bold text-white">Confirmar Pago a Ganador</h3>
            <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700 space-y-2">
                <p className="text-gray-300">¿Estás seguro de que quieres marcar este premio como pagado?</p>
                <div className="border-t border-white/10 pt-3 mt-3 text-sm">
                  <p className="text-gray-400"><span className="font-semibold text-white">Ticket:</span> {selectedWinner.ticketId}</p>
                  <p className="text-gray-400"><span className="font-semibold text-white">Cliente:</span> {selectedWinner.clientName}</p>
                  <p className="text-gray-400"><span className="font-semibold text-white">Número Ganador:</span> {selectedWinner.play.number} ({selectedWinner.prize})</p>
                </div>
            </div>
            <div className="flex justify-end gap-4">
              <button onClick={() => setIsPayModalOpen(false)} className="px-6 py-2 rounded-md font-semibold bg-gray-600 hover:bg-gray-500 text-white transition-colors">Cancelar</button>
              <button onClick={handleConfirmPayment} className="px-6 py-2 rounded-md font-semibold bg-green-600 hover:bg-green-500 text-white transition-colors">Sí, Marcar como Pagado</button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && resultToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl p-8 space-y-6 w-full max-w-md ${themeStyles.glassClasses} border border-white/10`}>
            <div className="text-center">
                <FiAlertTriangle className="mx-auto text-red-500 h-12 w-12 mb-4"/>
                <h3 className={`text-xl font-bold ${themeStyles.textPrimary}`}>¿Estás seguro?</h3>
                <p className={`mt-2 text-sm ${themeStyles.textSecondary}`}>
                    Vas a eliminar permanentemente los resultados para <span className="font-bold">{resultToDelete.drawName}</span> del horario <span className="font-bold">{resultToDelete.schedule}</span>. Esta acción no se puede deshacer.
                </p>
            </div>
            <div className="flex justify-center gap-4">
              <button onClick={() => setIsDeleteModalOpen(false)} className={`px-6 py-2 rounded-md font-semibold bg-gray-500 text-white`}>Cancelar</button>
              <button onClick={handleConfirmDelete} className="px-6 py-2 rounded-md font-semibold bg-red-600 text-white">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && resultToEdit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl p-8 space-y-6 w-full max-w-md ${themeStyles.glassClasses} border border-white/10`}>
            <div>
                <h3 className={`text-xl font-bold ${themeStyles.textPrimary}`}>Editar Resultado</h3>
                <p className={`mt-1 text-sm ${themeStyles.textSecondary}`}>
                    Sorteo: <span className="font-semibold">{resultToEdit.drawName}</span> - Horario: <span className="font-semibold">{resultToEdit.schedule}</span>
                </p>
            </div>
            <div className="flex items-end gap-4">
                <div className="flex-1 text-center">
                    <span className="text-xs text-white">1ro</span>
                    <input type="text" inputMode="numeric" className={`w-full border rounded-lg p-2 text-center outline-none bg-white/10 text-white border-white/20 font-medium`} value={editNumbers['1ro']} onChange={(e) => handleEditNumberChange('1ro', e.target.value)} maxLength={draws.find(d => d.id === resultToEdit.drawId)?.cif} />
                </div>
                <div className="flex-1 text-center">
                    <span className="text-xs text-white">2do</span>
                    <input type="text" inputMode="numeric" className={`w-full border rounded-lg p-2 text-center outline-none bg-white/10 text-white border-white/20 font-medium`} value={editNumbers['2do']} onChange={(e) => handleEditNumberChange('2do', e.target.value)} maxLength={draws.find(d => d.id === resultToEdit.drawId)?.cif} />
                </div>
                <div className="flex-1 text-center">
                    <span className="text-xs text-white">3ro</span>
                    <input type="text" inputMode="numeric" className={`w-full border rounded-lg p-2 text-center outline-none bg-white/10 text-white border-white/20 font-medium`} value={editNumbers['3ro']} onChange={(e) => handleEditNumberChange('3ro', e.target.value)} maxLength={draws.find(d => d.id === resultToEdit.drawId)?.cif} />
                </div>
            </div>
            <div className="flex justify-end gap-4">
              <button onClick={() => setIsEditModalOpen(false)} className={`px-6 py-2 rounded-md font-semibold bg-gray-500 text-white`}>Cancelar</button>
              <button onClick={handleConfirmUpdate} className="px-6 py-2 rounded-md font-semibold bg-blue-600 text-white">Actualizar</button>
            </div>
          </div>
        </div>
      )}

      {isReceiptModalOpen && (
        <Receipt 
          sale={saleForReceipt}
          drawName={saleForReceipt ? (draws.find(d => d.id === saleForReceipt.drawId)?.name || 'N/A') : ''}
          onClose={() => setIsReceiptModalOpen(false)}
          businessName={businessName}
          logoUrl={businessLogo}
        />
      )}

    </div>
  );
}
