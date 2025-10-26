'use client';
import { useState, useMemo } from 'react';
import { ResultsProvider, useResults, Result, Winner, Sale } from '@/contexts/ResultsContext'; // Importa el Provider
import { useDraws } from '@/contexts/DrawsContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@tremor/react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

// --- Tipos para las props de los componentes ---
type ResultCardProps = { result: Result; onDelete: (id: string) => void; onUpdate: (id: string) => void; };
type WinnerCardProps = { winner: Winner; };
type SaleCardProps = { sale: Sale; drawName: string; onReceiptClick: () => void; };
type ReceiptProps = { 
    sale: (Sale & { sellerId: string; costPerFraction: number; }) | null; 
    drawName: string; 
    onClose: () => void; 
    businessName: string; 
};

// --- Componentes Hijos (Sin cambios) ---

const ResultCard: React.FC<ResultCardProps> = ({ result, onDelete, onUpdate }) => (
  <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-green-500 transition-all duration-300">
    <div className="flex justify-between items-start mb-4">
      <div>
        <h3 className="text-xl font-bold text-white">{result.drawName}</h3>
        <p className="text-sm text-gray-400">Horario: {result.schedule}</p>
        <p className="text-xs text-gray-500">ID: {result.id}</p>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4 text-center">
      <div>
        <p className="text-sm text-gray-400">1ro</p>
        <p className="text-2xl font-bold text-green-400">{result.winningNumbers['1ro']}</p>
      </div>
      <div>
        <p className="text-sm text-gray-400">2do</p>
        <p className="text-2xl font-bold text-yellow-400">{result.winningNumbers['2do']}</p>
      </div>
      <div>
        <p className="text-sm text-gray-400">3ro</p>
        <p className="text-2xl font-bold text-blue-400">{result.winningNumbers['3ro']}</p>
      </div>
    </div>
    <p className="text-xs text-gray-600 text-right mt-4">Registrado: {new Date(result.timestamp).toLocaleString()}</p>
  </div>
);

const WinnerCard: React.FC<WinnerCardProps> = ({ winner }) => (
  <div className="bg-gray-800 rounded-lg shadow-md p-5 border border-gray-700">
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-lg font-semibold text-white">{winner.clientName}</h3>
      <span className="px-2 py-1 text-xs font-bold text-green-800 bg-green-400 rounded-full">{winner.prize} Premio</span>
    </div>
    <div className="space-y-2 text-sm text-gray-400">
      <p><span className="font-semibold text-gray-300">Sorteo:</span> {winner.drawName} ({winner.schedule})</p>
      <p><span className="font-semibold text-gray-300">Jugada:</span> Número {winner.play.number} - Monto: ${winner.play.amount.toFixed(2)}</p>
      <p><span className="font-semibold text-gray-300">Ticket ID:</span> {winner.ticketId}</p>
      <p className="text-xs text-gray-500">Vendido: {new Date(winner.timestamp).toLocaleString()}</p>
    </div>
  </div>
);

const SaleCard: React.FC<SaleCardProps> = ({ sale, drawName, onReceiptClick }) => (
  <div className="bg-gray-800 rounded-lg shadow-md p-5 border border-gray-700">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h3 className="text-lg font-semibold text-white">Ticket: {sale.ticketId}</h3>
        {sale.clientName && <p className="text-sm text-gray-400">Cliente: {sale.clientName}</p>}
      </div>
      <button onClick={onReceiptClick} className="text-green-400 hover:text-green-300 transition-colors">
          <DocumentTextIcon className="h-6 w-6" />
      </button>
    </div>
    <div className="space-y-3">
        <p className="text-sm text-gray-400"><span className="font-semibold text-gray-300">Sorteo:</span> {drawName}</p>
        <div className="border-t border-gray-700 pt-2">
            <p className="font-semibold text-gray-300 mb-1">Números Jugados:</p>
            <div className="grid grid-cols-3 gap-1 text-xs">
                {sale.numbers.map((n, index) => (
                    <div key={index} className="bg-gray-700/50 rounded px-2 py-1">
                        <span className="font-bold text-white">{n.number}: </span>
                        <span className="text-green-400">${n.quantity.toFixed(2)}</span>
                    </div>
                ))}
            </div>
        </div>
        <div className="flex justify-between items-center border-t border-gray-700 pt-3 mt-3">
            <p className="text-sm font-bold text-white">Total: <span className="text-green-400">${sale.totalCost.toFixed(2)}</span></p>
            <p className="text-xs text-gray-500">{new Date(sale.timestamp).toLocaleString()}</p>
        </div>
    </div>
  </div>
);

const Receipt: React.FC<ReceiptProps> = ({ sale, drawName, onClose, businessName }) => {
    if (!sale) return null;
    const totalCost = sale.numbers.reduce((acc, curr) => acc + curr.quantity, 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-white text-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-sm font-sans">
                <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                    <h2 className="text-2xl font-bold uppercase tracking-wider">{businessName}</h2>
                    <p className="text-sm">Recibo de Venta</p>
                </div>
                <div className="mb-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="font-semibold">Ticket ID:</span><span className="font-mono">{sale.ticketId}</span></div>
                    <div className="flex justify-between"><span className="font-semibold">Fecha:</span><span>{new Date(sale.timestamp).toLocaleDateString()}</span></div>
                    <div className="flex justify-between"><span className="font-semibold">Hora:</span><span>{new Date(sale.timestamp).toLocaleTimeString()}</span></div>
                    {sale.clientName && <div className="flex justify-between"><span className="font-semibold">Cliente:</span><span>{sale.clientName}</span></div>}
                    <div className="flex justify-between"><span className="font-semibold">Sorteo:</span><span>{drawName}</span></div>
                </div>
                <div className="border-t border-b border-dashed border-gray-300 py-2 mb-4">
                    <div className="flex justify-between font-bold text-xs mb-1"><span>Número</span><span>Costo</span></div>
                    <div className="space-y-1 text-sm">{sale.numbers.map((play, index) => <div key={index} className="flex justify-between font-mono"><span>{play.number}</span><span>${play.quantity.toFixed(2)}</span></div>)}</div>
                </div>
                <div className="text-right font-bold text-lg mb-6"><span className="mr-2">TOTAL:</span><span>${totalCost.toFixed(2)}</span></div>
                <button onClick={onClose} className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">Cerrar</button>
            </div>
        </div>
    );
};

// --- Componente de la Página de Resultados (ahora como un componente interno) ---
function ResultsPageContent() {
  const { results, winners, allSales, isLoading } = useResults();
  const { draws } = useDraws();
  const { businessName } = useBusiness();

  const [selectedDraw, setSelectedDraw] = useState('all');
  const [selectedSchedule, setSelectedSchedule] = useState('all');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [saleForReceipt, setSaleForReceipt] = useState<Sale | null>(null);

  const filteredResults = useMemo(() => {
    if (isLoading) return [];
    return results.filter(r => (selectedDraw === 'all' || r.drawId === selectedDraw) && (selectedSchedule === 'all' || r.schedule === selectedSchedule));
  }, [results, selectedDraw, selectedSchedule, isLoading]);

  const filteredWinners = useMemo(() => {
    if (isLoading) return [];
    const resultSchedules = new Set(filteredResults.map(r => `${r.drawId}-${r.schedule}`));
    return winners.filter(w => resultSchedules.has(`${draws.find(d => d.name === w.drawName)?.id}-${w.schedule}`));
  }, [winners, filteredResults, draws, isLoading]);

  const filteredSales = useMemo(() => {
    if (isLoading) return [];
    return allSales.filter(s => (selectedDraw === 'all' || s.drawId === selectedDraw) && (selectedSchedule === 'all' || s.schedules.includes(selectedSchedule)));
  }, [allSales, selectedDraw, selectedSchedule, isLoading]);

  const handleOpenReceipt = (sale: Sale) => {
    setSaleForReceipt(sale);
    setIsReceiptModalOpen(true);
  };

  const drawOptions = useMemo(() => [{ id: 'all', name: 'Todos los Sorteos' }, ...draws.map(d => ({ id: d.id, name: d.name }))], [draws]);

  const scheduleOptions = useMemo(() => {
    if (selectedDraw === 'all') return [{ id: 'all', name: 'Todos los Horarios' }, ...Array.from(new Set(draws.flatMap(d => d.schedules))).map(s => ({id: s, name: s}))];
    const draw = draws.find(d => d.id === selectedDraw);
    return [{ id: 'all', name: 'Todos los Horarios' }, ...(draw?.schedules.map(s => ({ id: s, name: s })) || [])];
  }, [draws, selectedDraw]);

  if (isLoading) return <div className="text-center p-10">Cargando datos...</div>;

  return (
    <div className="p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-white">Resultados y Ganadores</h1>
        <p className="text-gray-400">Filtra y revisa los resultados, ganadores y ventas.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex-1">
              <label htmlFor="drawFilter" className="block text-sm font-medium text-gray-300 mb-1">Sorteo</label>
              <select id="drawFilter" value={selectedDraw} onChange={e => setSelectedDraw(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-green-500 focus:border-green-500">
                  {drawOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
              </select>
          </div>
          <div className="flex-1">
              <label htmlFor="scheduleFilter" className="block text-sm font-medium text-gray-300 mb-1">Horario</label>
              <select id="scheduleFilter" value={selectedSchedule} onChange={e => setSelectedSchedule(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-green-500 focus:border-green-500">
                  {scheduleOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
              </select>
          </div>
      </div>

      <TabGroup>
        <TabList variant="solid" className="w-full">
          <Tab>Resultados ({filteredResults.length})</Tab>
          <Tab>Ganadores ({filteredWinners.length})</Tab>
          <Tab>Ventas ({filteredSales.length})</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
              {filteredResults.length > 0 ? (
                filteredResults.map(result => <ResultCard key={result.id} result={result} onDelete={() => {}} onUpdate={() => {}} />)
              ) : (
                <p className="text-gray-500 col-span-full text-center">No hay resultados para mostrar con los filtros seleccionados.</p>
              )}
            </div>
          </TabPanel>
          <TabPanel>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
              {filteredWinners.length > 0 ? (
                filteredWinners.map(winner => <WinnerCard key={winner.ticketId + winner.play.number} winner={winner} />)
              ) : (
                <p className="text-gray-500 col-span-full text-center">No hay ganadores para mostrar con los filtros seleccionados.</p>
              )}
            </div>
          </TabPanel>
           <TabPanel>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
              {filteredSales.length > 0 ? (
                filteredSales.map(sale => (
                  <SaleCard 
                    key={sale.ticketId}
                    sale={sale}
                    drawName={draws.find(d => d.id === sale.drawId)?.name || 'N/A'}
                    onReceiptClick={() => handleOpenReceipt(sale)}
                  />
                ))
              ) : (
                <p className="text-gray-500 col-span-full text-center">No hay ventas para mostrar con los filtros seleccionados.</p>
              )}
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
      
      {isReceiptModalOpen && (
        <Receipt 
          sale={saleForReceipt ? { ...saleForReceipt, sellerId: '', costPerFraction: 0 } : null}
          drawName={saleForReceipt ? (draws.find(d => d.id === saleForReceipt.drawId)?.name || 'N/A') : ''}
          onClose={() => setIsReceiptModalOpen(false)}
          businessName={businessName}
        />
      )}
    </div>
  );
}

// --- Componente Principal (Wrapper) ---
export default function ResultsPage() {
  return (
    <ResultsProvider>
      <ResultsPageContent />
    </ResultsProvider>
  );
}
