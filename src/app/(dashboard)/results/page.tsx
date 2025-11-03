'use client';
import { useState, useMemo, FC } from 'react';
import { ResultsProvider, useResults, Result, Winner, Sale } from '@/contexts/ResultsContext';
import { useDraws } from '@/contexts/DrawsContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@tremor/react';
import { DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/solid';

// Tipos para las props de los componentes
type ResultCardProps = { result: Result };
type WinnerCardProps = { winner: Winner };
type SaleCardProps = { sale: Sale; drawName: string; onReceiptClick: () => void; };
type ReceiptProps = { sale: Sale | null; drawName: string; onClose: () => void; businessName: string; };

// --- Componente de Tarjeta de Resultado ---
const ResultCard: FC<ResultCardProps> = ({ result }) => (
  <div className="bg-gray-800/50 rounded-xl shadow-lg p-5 border border-gray-700/80 backdrop-blur-sm hover:border-green-500/60 transition-all duration-300">
    <div className="flex justify-between items-center mb-4">
      <div>
        <h3 className="text-xl font-bold text-white">{result.drawName}</h3>
        <p className="text-sm text-gray-400">{result.schedule}</p>
      </div>
      <span className="text-xs text-gray-500">{new Date(result.timestamp).toLocaleDateString()}</span>
    </div>
    <div className="grid grid-cols-3 gap-3 text-center">
      <div>
        <p className="text-sm font-medium text-gray-400">1ro</p>
        <p className="text-3xl font-bold text-green-400 tracking-wider">{result.winningNumbers['1ro']}</p>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-400">2do</p>
        <p className="text-2xl font-semibold text-yellow-400 tracking-wider">{result.winningNumbers['2do']}</p>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-400">3ro</p>
        <p className="text-2xl font-semibold text-blue-400 tracking-wider">{result.winningNumbers['3ro']}</p>
      </div>
    </div>
  </div>
);

// --- Componente de Tarjeta de Ganador ---
const WinnerCard: FC<WinnerCardProps> = ({ winner }) => (
  <div className="bg-gray-800/50 rounded-xl shadow-lg p-5 border border-gray-700/80 backdrop-blur-sm hover:border-yellow-500/60 transition-all duration-300">
    <div className="flex justify-between items-start mb-3">
      <h3 className="text-lg font-semibold text-white truncate">{winner.clientName || 'Cliente Anónimo'}</h3>
      <span className="px-3 py-1 text-xs font-bold text-yellow-900 bg-yellow-400 rounded-full shadow-md">{winner.prize}º Premio</span>
    </div>
    <div className="text-sm text-gray-400 space-y-2 mt-4">
        <p><span className="font-semibold text-gray-300">Jugada:</span> <span className="font-mono text-lg text-white">{winner.play.number}</span></p>
        <p><span className="font-semibold text-gray-300">Monto:</span> <span className="text-green-400 font-bold">${winner.play.amount.toFixed(2)}</span></p>
        <p><span className="font-semibold text-gray-300">Sorteo:</span> {winner.drawName} ({winner.schedule})</p>
    </div>
     <p className="text-xs text-gray-600 text-right mt-4">Ticket: {winner.ticketId}</p>
  </div>
);

// --- Componente de Tarjeta de Venta ---
const SaleCard: FC<SaleCardProps> = ({ sale, drawName, onReceiptClick }) => (
  <div className="bg-gray-800/50 rounded-xl shadow-lg p-5 border border-gray-700/80 backdrop-blur-sm hover:border-blue-500/60 transition-all duration-300 flex flex-col justify-between">
    <div>
        <div className="flex justify-between items-start mb-3">
            <div>
                <h3 className="text-lg font-bold text-white">Ticket: <span className="font-mono">{sale.ticketId}</span></h3>
                {sale.clientName && <p className="text-sm text-gray-400">Cliente: {sale.clientName}</p>}
            </div>
            <button onClick={onReceiptClick} className="text-blue-400 hover:text-blue-300 transition-colors p-1 rounded-full hover:bg-gray-700">
                <DocumentTextIcon className="h-6 w-6" />
            </button>
        </div>
        <p className="text-sm text-gray-400 mb-2"><span className="font-semibold text-gray-300">Sorteo:</span> {drawName}</p>
        <div className="border-t border-gray-700 pt-2 text-xs">
            <p className="font-semibold text-gray-300 mb-1">Jugadas:</p>
            <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                {sale.numbers.map((n, index) => (
                    <div key={index} className="bg-gray-700/60 rounded px-2 py-1 flex justify-between">
                        <span className="font-bold text-white">{n.number}</span>
                        <span className="text-green-400">${n.quantity.toFixed(2)}</span>
                    </div>
                ))}
            </div>
        </div>
    </div>
    <div className="flex justify-between items-center border-t border-gray-700 pt-3 mt-4">
        <p className="text-md font-bold text-white">Total: <span className="text-green-400">${sale.totalCost.toFixed(2)}</span></p>
        <p className="text-xs text-gray-500">{new Date(sale.timestamp).toLocaleString()}</p>
    </div>
  </div>
);

// --- Componente del Recibo Modal ---
const Receipt: FC<ReceiptProps> = ({ sale, drawName, onClose, businessName }) => {
    if (!sale) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-gray-100 text-gray-900 rounded-lg shadow-2xl p-6 w-full max-w-sm font-mono relative">
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800">
                    <XMarkIcon className="h-6 w-6" />
                </button>
                <div className="text-center border-b-2 border-dashed border-gray-400 pb-4 mb-4">
                    <h2 className="text-2xl font-bold uppercase tracking-widest">{businessName}</h2>
                    <p className="text-sm text-gray-600">Comprobante de Venta</p>
                </div>
                <div className="mb-4 space-y-1 text-sm">
                    <p><strong>Ticket:</strong> {sale.ticketId}</p>
                    <p><strong>Fecha:</strong> {new Date(sale.timestamp).toLocaleString()}</p>
                    {sale.clientName && <p><strong>Cliente:</strong> {sale.clientName}</p>}
                    <p><strong>Sorteo:</strong> {drawName}</p>
                </div>
                <div className="border-t border-b border-dashed border-gray-400 py-3 my-3">
                    <div className="flex justify-between font-bold text-xs mb-2"><span>Número</span><span>Monto</span></div>
                    <div className="space-y-1 text-sm">
                        {sale.numbers.map((play, index) => 
                            <div key={index} className="flex justify-between"><span>{play.number}</span><span>${play.quantity.toFixed(2)}</span></div>
                        )}
                    </div>
                </div>
                <div className="text-right font-bold text-lg mb-4">TOTAL: ${sale.totalCost.toFixed(2)}</div>
                <div className="text-center text-xs text-gray-500">¡Gracias por su jugada!</div>
            </div>
        </div>
    );
};


// --- Contenido Principal de la Página ---
function ResultsPageContent() {
  const { results, winners, allSales, isLoading } = useResults();
  const { draws } = useDraws();
  const { businessName } = useBusiness();

  const [selectedDraw, setSelectedDraw] = useState('all');
  const [selectedSchedule, setSelectedSchedule] = useState('all');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [saleForReceipt, setSaleForReceipt] = useState<Sale | null>(null);

  // Opciones para los filtros
  const drawOptions = useMemo(() => [{ id: 'all', name: 'Todos los Sorteos' }, ...draws.map(d => ({ id: d.id, name: d.name }))], [draws]);
  const scheduleOptions = useMemo(() => {
    const allSchedules = [...new Set(draws.flatMap(d => d.schedules))];
    const relevantSchedules = selectedDraw === 'all' ? allSchedules : draws.find(d => d.id === selectedDraw)?.schedules || [];
    return [{ value: 'all', label: 'Todos los Horarios' }, ...relevantSchedules.map(s => ({ value: s, label: s }))];
  }, [draws, selectedDraw]);

  // Lógica de filtrado
  const filteredResults = useMemo(() => results.filter(r => (selectedDraw === 'all' || r.drawId === selectedDraw) && (selectedSchedule === 'all' || r.schedule === selectedSchedule)), [results, selectedDraw, selectedSchedule]);
  const filteredWinners = useMemo(() => winners.filter(w => (selectedDraw === 'all' || draws.find(d => d.name === w.drawName)?.id === selectedDraw) && (selectedSchedule === 'all' || w.schedule === selectedSchedule)), [winners, selectedDraw, selectedSchedule, draws]);
  const filteredSales = useMemo(() => allSales.filter(s => (selectedDraw === 'all' || s.drawId === selectedDraw) && (selectedSchedule === 'all' || s.schedules.includes(selectedSchedule))), [allSales, selectedDraw, selectedSchedule]);

  const handleOpenReceipt = (sale: Sale) => {
    setSaleForReceipt(sale);
    setIsReceiptModalOpen(true);
  };
  
  if (isLoading) return <div className="text-center p-20"><p className="text-lg text-gray-400">Cargando datos...</p></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-black text-white tracking-tighter">Resultados</h1>
        <p className="text-gray-400 mt-1">Consulta resultados, ganadores y ventas por sorteo y horario.</p>
      </header>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 p-4 bg-gray-800/60 rounded-xl border border-gray-700/80">
          <div>
              <label htmlFor="drawFilter" className="block text-sm font-medium text-gray-300 mb-2">Filtrar por Sorteo</label>
              <select id="drawFilter" value={selectedDraw} onChange={e => setSelectedDraw(e.target.value)} className="w-full bg-gray-700/80 border-gray-600 rounded-md shadow-sm text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition">
                  {drawOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
              </select>
          </div>
          <div>
              <label htmlFor="scheduleFilter" className="block text-sm font-medium text-gray-300 mb-2">Filtrar por Horario</label>
              <select id="scheduleFilter" value={selectedSchedule} onChange={e => setSelectedSchedule(e.target.value)} className="w-full bg-gray-700/80 border-gray-600 rounded-md shadow-sm text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition" disabled={!draws.length}>
                  {scheduleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
          </div>
      </div>

      {/* Pestañas de Contenido */}
      <TabGroup>
        <TabList variant="solid" className="w-full">
          <Tab>Resultados ({filteredResults.length})</Tab>
          <Tab>Ganadores ({filteredWinners.length})</Tab>
          <Tab>Ventas ({filteredSales.length})</Tab>
        </TabList>
        <TabPanels className="mt-6">
          <TabPanel>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredResults.length > 0 ? 
                filteredResults.map(r => <ResultCard key={r.id} result={r} />) : 
                <p className="text-gray-500 col-span-full text-center py-10">No hay resultados para los filtros seleccionados.</p>}
            </div>
          </TabPanel>
          <TabPanel>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredWinners.length > 0 ? 
                filteredWinners.map((w, i) => <WinnerCard key={`${w.ticketId}-${i}`} winner={w} />) : 
                <p className="text-gray-500 col-span-full text-center py-10">No hay ganadores para los filtros seleccionados.</p>}
            </div>
          </TabPanel>
           <TabPanel>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredSales.length > 0 ? 
                filteredSales.map(s => <SaleCard key={s.ticketId} sale={s} drawName={draws.find(d => d.id === s.drawId)?.name || 'N/A'} onReceiptClick={() => handleOpenReceipt(s)} />) : 
                <p className="text-gray-500 col-span-full text-center py-10">No hay ventas para los filtros seleccionados.</p>}
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
      
      {/* Modal del Recibo */}
      {isReceiptModalOpen && 
        <Receipt 
          sale={saleForReceipt}
          drawName={saleForReceipt ? (draws.find(d => d.id === saleForReceipt.drawId)?.name || 'N/A') : ''}
          onClose={() => setIsReceiptModalOpen(false)}
          businessName={businessName}
        />}
    </div>
  );
}

// --- Componente Principal (Wrapper) que exportamos ---
export default function ResultsPage() {
  return (
    <ResultsProvider>
      <ResultsPageContent />
    </ResultsProvider>
  );
}
