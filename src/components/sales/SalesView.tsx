'use client';

import { useMemo, Fragment, useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray, useWatch, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, Trash2, Eye, Edit, MoreVertical, Ticket as TicketIcon } from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import Receipt from './Receipt';
import { useSales, Sale } from '@/contexts/SalesContext';
import { UnifiedSchedule } from '@/contexts/UnifiedSchedulesContext';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';

// --- Zod Schema para el nuevo formulario ---
const formSchema = z.object({
  numbers: z.array(z.object({
    number: z.string().min(1, 'El número es requerido.'),
    quantity: z.coerce.number().int().min(1, 'Mínimo 1')
  })).nonempty('Añade al menos un número.'),
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// --- Funciones de Utilidad (sin cambios) ---
type SaleTimestamp = string | Timestamp | undefined | null;
const getSaleDate = (timestamp: SaleTimestamp): Date => {
  if (!timestamp) return new Date(0);
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return new Date(timestamp as string);
};

const generateTicketId = () => `S${Date.now().toString(36).slice(-4).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

type ParsedItem = { number: string; quantity: number };
type ParseResult = { items: ParsedItem[]; errors: string[] };
const parseBulkNumbers = (raw: string, digits: number, invert: boolean): ParseResult => {
  const errors: string[] = [];
  if (!raw) return { items: [], errors: ['Entrada vacía.'] };
  const s = raw.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/[–—−]/g, '-');
  const re = new RegExp(`\\b(\\d{1,${Math.max(1, digits)}})\\s*-\\s*(\\d{1,4})\\b`, 'g');
  const matches = [...s.matchAll(re)];
  if (matches.length === 0) return { items: [], errors: ['No se detectaron pares "NUM-CANT".'] };
  const items: ParsedItem[] = [];
  for (const m of matches) {
    const [numRaw, qtyRaw] = invert ? [m[2], m[1]] : [m[1], m[2]];
    const numInt = Number(numRaw), qtyInt = Number(qtyRaw);
    if (!Number.isInteger(numInt) || !Number.isInteger(qtyInt) || qtyInt < 1) { errors.push(`Inválido: "${m[0]}"`); continue; }
    const normalized = String(numInt).padStart(digits, '0');
    if (normalized.length > digits) { errors.push(`Excede ${digits} cifras: "${m[0]}"`); continue; }
    items.push({ number: normalized, quantity: qtyInt });
  }
  return { items, errors };
};

type DuplicatePolicy = 'sum' | 'replace' | 'ignore';
type ApplyMode = 'add' | 'replaceAll';
const mergeRows = (existing: ParsedItem[], incoming: ParsedItem[], policy: DuplicatePolicy): ParsedItem[] => {
  const map = new Map<string, number>();
  existing.forEach(r => { if (r.number) map.set(r.number, (map.get(r.number) || 0) + r.quantity); });
  incoming.forEach(r => {
    if (!r.number) return;
    if (!map.has(r.number) || policy === 'replace') map.set(r.number, r.quantity);
    else if (policy === 'sum') map.set(r.number, (map.get(r.number) || 0) + r.quantity);
  });
  return [...map.entries()].map(([number, quantity]) => ({ number, quantity }));
};


// --- Componente SalesView Actualizado ---
const SalesView: React.FC<{ schedule: UnifiedSchedule; businessName?: string; logoUrl?: string; }> = ({ schedule, businessName, logoUrl }) => {
  const { sales, addSale, updateSale, deleteSale, isLoading } = useSales();
  const [activeTab, setActiveTab] = useState('sell');
  const [viewingReceipt, setViewingReceipt] = useState<Sale | null>(null);
  const [sessionSales, setSessionSales] = useState<Sale[]>([]);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  
  // Estados de pegado rápido
  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState<ParsedItem[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [duplicatePolicy, setDuplicatePolicy] = useState<DuplicatePolicy>('sum');
  const [applyMode, setApplyMode] = useState<ApplyMode>('add');
  const [invertList, setInvertList] = useState(false);

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), mode: 'all', defaultValues: { numbers: [{ number: '', quantity: 1 }], clientName: '', clientPhone: '' } });
  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: 'numbers' });
  
  const costPerFraction = schedule.cost || 0.2;
  const watchedNumbers = useWatch({ control: form.control, name: 'numbers' });
  const totalCost = useMemo(() => (watchedNumbers || []).reduce((acc, curr) => acc + (Number(curr?.quantity) || 0), 0) * costPerFraction, [watchedNumbers, costPerFraction]);

  const completedSales = useMemo(() => {
    const combined = [...sales.filter(s => s.drawId === schedule.drawId && s.schedule === schedule.schedule), ...sessionSales];
    return Array.from(new Map(combined.map(s => [s.id || s.ticketId, s])).values()).sort((a, b) => getSaleDate(b.timestamp).getTime() - getSaleDate(a.timestamp).getTime());
  }, [sales, sessionSales, schedule]);

  // Resetear formulario cuando cambia el horario
  useEffect(() => {
    form.reset({ numbers: [{ number: '', quantity: 1 }], clientName: '', clientPhone: '' });
    setEditingSale(null);
    setActiveTab('sell');
  }, [schedule, form]);

  const handleEditSale = (saleToEdit: Sale) => {
    setEditingSale(saleToEdit);
    setActiveTab('sell');
  };

  // Efecto para popular el formulario en modo edición
  useEffect(() => {
    if (editingSale && editingSale.schedule === schedule.schedule) {
        form.reset({ numbers: editingSale.numbers, clientName: editingSale.clientName || '', clientPhone: editingSale.clientPhone || '' });
        setBulkText(''); setBulkPreview([]); setBulkErrors([]);
    } else {
        setEditingSale(null); // Cancelar edición si el horario cambia
    }
  }, [editingSale, schedule, form]);

  const digits = Math.max(1, Number(schedule.cif) || 2);

  // --- Handler de Submit Actualizado ---
  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    if (submittingRef.current) return;
    setIsSubmitting(true); submittingRef.current = true;
    try {
      const saleData = {
        ...values,
        drawId: schedule.drawId,
        drawName: schedule.drawName,
        schedule: schedule.schedule,
        totalCost,
        costPerFraction,
        sellerId: 'seller01',
        receiptUrl: '',
        drawLogo: schedule.logo,
      };

      if (editingSale?.id) {
        await updateSale(editingSale.id, saleData);
        toast.success("Venta actualizada");
        setEditingSale(null);
      } else {
        const newSale = await addSale({ ...saleData, ticketId: generateTicketId() });
        if (newSale) setSessionSales(p => [newSale, ...p]);
        toast.success("Venta completada");
      }
      form.reset({ numbers: [{ number: '', quantity: 1 }], clientName: '', clientPhone: '' });
      setBulkText(''); setBulkPreview([]); setBulkErrors([]);
      setActiveTab('history');
    } catch (e: any) {
      toast.error(e.message || "Error al procesar la venta");
    } finally {
      setIsSubmitting(false); submittingRef.current = false;
    }
  };
  
  const handleProcessBulk = () => {
    const res = parseBulkNumbers(bulkText, digits, invertList);
    setBulkPreview(res.items); setBulkErrors(res.errors);
    if (res.items.length === 0) toast.error(res.errors[0] || 'No se procesaron datos.');
    else toast.success(`Procesado: ${res.items.length} fila(s)`);
  };

  const handleApplyBulk = () => {
    const res = bulkPreview.length ? { items: bulkPreview, errors: bulkErrors } : parseBulkNumbers(bulkText, digits, invertList);
    if (res.items.length === 0) { toast.error('No hay filas válidas para aplicar.'); return; }
    const current = (watchedNumbers || []).filter(r => r.number);
    const nextRows = applyMode === 'replaceAll' ? mergeRows([], res.items, duplicatePolicy) : mergeRows(current, res.items, duplicatePolicy);
    replace(nextRows.length > 0 ? nextRows : [{ number: '', quantity: 1 }]);
    toast.success(`Aplicado: ${nextRows.length} fila(s)`);
  };

  return (
    <>
      <div className="flex flex-col gap-8 h-full">
        {/* Panel de Pegado Rápido (sin cambios) */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Pegado Rápido (Lista)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 space-y-3">
                <p className="text-sm text-white/60">Pega tu lista en formato <span className="font-mono bg-black/20 px-1 rounded">NÚMERO-CANTIDAD</span>.</p>
                 <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-white/80">Invertir (Cant-Núm)</label>
                        <button onClick={() => setInvertList(v => !v)} className={`px-3 py-1 text-xs font-semibold rounded-full border ${invertList ? 'bg-orange-600 text-white border-orange-500' : 'bg-white/10 text-white/80 border-white/20'}`}>{invertList ? 'ON' : 'OFF'}</button>
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-white/80">Al aplicar</label>
                        <select value={applyMode} onChange={e => setApplyMode(e.target.value as ApplyMode)} className="bg-black/30 border border-white/20 rounded-lg py-1 px-2 text-white text-xs"><option value="add">Agregar</option><option value="replaceAll">Reemplazar</option></select>
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-white/80">Duplicados</label>
                        <select value={duplicatePolicy} onChange={e => setDuplicatePolicy(e.target.value as DuplicatePolicy)} className="bg-black/30 border border-white/20 rounded-lg py-1 px-2 text-white text-xs"><option value="sum">Sumar</option><option value="replace">Reemplazar</option><option value="ignore">Ignorar</option></select>
                    </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder="Pega aquí tu lista...\n26-5\n14-10\n02-3..." className="w-full h-full min-h-[120px] bg-black/20 border border-white/20 rounded-lg p-3 text-white text-sm focus:ring-1 focus:ring-green-500"></textarea>
              </div>
            </div>
            <div className="flex gap-2 pt-4 mt-4 border-t border-white/10">
                <button type="button" onClick={handleProcessBulk} className="w-full md:w-auto flex-grow bg-white/10 hover:bg-white/15 border border-white/15 text-white text-sm font-semibold py-2 px-4 rounded-lg">Procesar</button>
                <button type="button" onClick={handleApplyBulk} disabled={!bulkText.trim()} className="w-full md:w-auto flex-grow bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 px-4 rounded-lg disabled:opacity-50">Aplicar</button>
            </div>
        </div>

        {/* Panel de Venta e Historial */}
        <div className="bg-white/5 border border-white/10 rounded-2xl flex flex-col">
            <div className="p-3 border-b border-white/10 flex-shrink-0">
                <div className="flex space-x-1 bg-black/20 p-1 rounded-lg">
                    <button onClick={() => setActiveTab('sell')} className={`w-full py-2 text-sm font-medium rounded-md ${activeTab === 'sell' ? 'bg-green-600 text-white shadow' : 'text-white/70 hover:bg-white/10'}`}>{editingSale ? `Editando Venta...` : 'Venta Manual'}</button>
                    <button onClick={() => setActiveTab('history')} className={`w-full py-2 text-sm font-medium rounded-md ${activeTab === 'history' ? 'bg-green-600 text-white shadow' : 'text-white/70 hover:bg-white/10'}`}>{`Historial (${completedSales.length})`}</button>
                </div>
            </div>

            <main className="flex-grow overflow-y-auto p-5">
              {activeTab === 'sell' && (
                  <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                       <div className="flex-grow space-y-6">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="clientName" className="block text-xs font-medium text-white/70 mb-1">Nombre Cliente <span className="text-white/50">(Opcional)</span></label>
                                <input id="clientName" {...form.register('clientName')} className="w-full bg-black/20 border-white/20 border rounded-lg py-1.5 px-3 text-white focus:ring-1 focus:ring-green-500" />
                            </div>
                            <div>
                                <label htmlFor="clientPhone" className="block text-xs font-medium text-white/70 mb-1">Teléfono Cliente <span className="text-white/50">(Opcional)</span></label>
                                <input id="clientPhone" {...form.register('clientPhone')} className="w-full bg-black/20 border-white/20 border rounded-lg py-1.5 px-3 text-white focus:ring-1 focus:ring-green-500" />
                            </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-white/90 mb-3">Añadir Números</h4>
                          <div className="space-y-3">
                            {fields.map((field, index) => (
                              <div key={field.id} className="flex items-center gap-3">
                                <input placeholder="Número" {...form.register(`numbers.${index}.number`)} maxLength={digits} className={`w-full bg-black/20 border rounded-lg p-1.5 px-3 text-white ${form.formState.errors.numbers?.[index]?.number ? 'border-red-500' : 'border-white/20'}`} />
                                <input type="number" placeholder="Cantidad" {...form.register(`numbers.${index}.quantity`)} className="w-36 bg-black/20 border-white/20 border rounded-lg py-1.5 px-3 text-white" />
                                <button type="button" onClick={() => remove(index)} className="p-2 text-red-500/70 hover:text-red-500 disabled:opacity-50" disabled={fields.length <= 1}><Trash2 className="w-4 h-4" /></button>
                              </div>
                            ))}
                          </div>
                          {form.formState.errors.numbers && <p className="text-red-500 text-xs mt-2">{form.formState.errors.numbers.root?.message}</p>}
                          <button type="button" onClick={() => append({ number: '', quantity: 1 })} className="mt-4 flex items-center gap-2 text-green-400 hover:text-green-300 text-sm"><PlusCircle className="w-5 h-5" />Añadir Número</button>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center">
                          <div>
                              <span className="text-sm text-white/70">Total Venta:</span>
                              <p className="text-2xl font-bold text-green-400">${totalCost.toFixed(2)}</p>
                          </div>
                          <button type="submit" disabled={!form.formState.isValid || isSubmitting} className="bg-green-600 text-white font-semibold py-2.5 px-6 rounded-lg shadow-lg disabled:bg-gray-500 disabled:opacity-50 hover:bg-green-700">{editingSale ? 'Actualizar Venta' : 'Completar Venta'}</button>
                      </div>
                  </form>
              )}
              {activeTab === 'history' && (
                 <div className="p-1 sm:p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Historial para {schedule.drawName} {schedule.schedule}</h3>
                    {isLoading ? <p className="text-center py-8">Cargando historial...</p> : completedSales.length > 0 ? (
                        <div className="space-y-3">
                            {completedSales.map(sale => (
                                <div key={sale.id} className="bg-black/20 p-3 rounded-lg flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-mono text-sm text-white truncate"><span className="font-bold">ID:</span> {sale.ticketId}</p>
                                        <p className="text-xs text-white/70 mt-1 truncate"><span className="font-semibold">Cliente:</span> {sale.clientName || 'N/A'}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-green-400">${sale.totalCost.toFixed(2)}</p>
                                            <p className="text-xs text-white/60">{sale.schedule}</p>
                                        </div>
                                        <ActionMenu sale={sale} onVisualize={() => setViewingReceipt(sale)} onEdit={() => handleEditSale(sale)} onDelete={() => sale.id && deleteSale(sale.id)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 px-4 bg-black/20 rounded-lg">
                            <TicketIcon className="mx-auto w-12 h-12 text-white/30"/>
                            <p className="mt-4 text-white/70">No hay ventas registradas para este sorteo y horario.</p>
                        </div>
                    )}
                </div>
              )}
            </main>
        </div>
      </div>

      {viewingReceipt && <Receipt sale={viewingReceipt} drawName={`${schedule.drawName} ${schedule.schedule}`} onClose={() => setViewingReceipt(null)} businessName={businessName} logoUrl={logoUrl} />}
    </>
  );
};

const ActionMenu: React.FC<{ sale: Sale; onVisualize: () => void; onEdit: () => void; onDelete: () => void; }> = ({ onVisualize, onEdit, onDelete }) => (
  <Menu as="div" className="relative inline-block text-left">
    <Menu.Button className="p-1.5 rounded-full text-white/70 hover:bg-white/20"><MoreVertical className="w-5 h-5" /></Menu.Button>
    <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
      <Menu.Items className="absolute right-0 w-48 mt-2 origin-top-right bg-gray-800 border border-white/20 rounded-md shadow-lg z-20">
        <div className="p-1"><Menu.Item>{({ active }) => <button onClick={onEdit} className={`${active ? 'bg-blue-600' : ''} group flex rounded-md items-center w-full px-2 py-2 text-sm text-white`}><Edit className="w-5 h-5 mr-2" />Editar</button>}</Menu.Item></div>
        <div className="p-1"><Menu.Item>{({ active }) => <button onClick={onVisualize} className={`${active ? 'bg-green-600' : ''} group flex rounded-md items-center w-full px-2 py-2 text-sm text-white`}><Eye className="w-5 h-5 mr-2" />Visualizar</button>}</Menu.Item></div>
        <div className="p-1 border-t border-white/10"><Menu.Item>{({ active }) => <button onClick={onDelete} className={`${active ? 'bg-red-600' : ''} group flex rounded-md items-center w-full px-2 py-2 text-sm text-red-400 hover:text-white`}><Trash2 className="w-5 h-5 mr-2" />Eliminar</button>}</Menu.Item></div>
      </Menu.Items>
    </Transition>
  </Menu>
);

export default SalesView;