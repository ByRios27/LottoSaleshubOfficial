'use client';

import { useMemo, Fragment, useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray, useWatch, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, PlusCircle, Trash2, Eye, Share2, MoreVertical, Edit, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import Receipt from './Receipt';
import { useSales, Sale } from '@/contexts/SalesContext';
import { useClosedSchedules } from '@/contexts/ClosedSchedulesContext';
import type { Draw } from '@/contexts/DrawsContext';
import { toast } from 'sonner';
import React from 'react';
import { Ticket as TicketIcon } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

const formSchema = z.object({
  schedules: z.array(z.string()).nonempty('Debes seleccionar al menos un sorteo.'),
  numbers: z.array(z.object({ number: z.string().min(1, 'El número es requerido.'), quantity: z.coerce.number().int().min(1, 'Mínimo 1') })).nonempty('Añade al menos un número.'),
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  pales: z.array(z.object({
    number: z.string().length(4, 'El número del pale debe tener 4 dígitos.'),
    quantity: z.coerce.number().min(0.10, 'Mínimo 0.10').max(5, 'Máximo 5'),
  })).optional(),
});

type FormValues = z.infer<typeof formSchema>;

type SaleTimestamp = string | Timestamp | undefined | null;
const getSaleDate = (timestamp: SaleTimestamp): Date => {
  if (!timestamp) return new Date(0);
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return new Date(timestamp as string);
};

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

const generateTicketId = () => `S${Date.now().toString(36).slice(-4).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

const SalesModal: React.FC<{ draw: Draw | null; onClose: () => void; businessName?: string; logoUrl?: string; }> = ({ draw, onClose, businessName, logoUrl }) => {
  const { sales, addSale, updateSale, deleteSale, isLoading } = useSales();
  const { closedSchedules } = useClosedSchedules();
  const [activeTab, setActiveTab] = useState('sell');
  const [viewingReceipt, setViewingReceipt] = useState<Sale | null>(null);
  const [sessionSales, setSessionSales] = useState<Sale[]>([]);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState<ParsedItem[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [duplicatePolicy, setDuplicatePolicy] = useState<DuplicatePolicy>('sum');
  const [applyMode, setApplyMode] = useState<ApplyMode>('add');
  const [invertList, setInvertList] = useState(false);

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), mode: 'all', defaultValues: { schedules: [], numbers: [{ number: '', quantity: 1 }], pales: [], clientName: '', clientPhone: '' } });
  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: 'numbers' });
  const { fields: paleFields, append: appendPale, remove: removePale } = useFieldArray({ control: form.control, name: 'pales' });
  
  const schedules = useMemo(() => draw?.sch || [], [draw]);
  const costPerFraction = draw?.cost || 0.2;
  const watchedNumbers = useWatch({ control: form.control, name: 'numbers' });
  const watchedPales = useWatch({ control: form.control, name: 'pales' });
  const watchedSchedules = useWatch({ control: form.control, name: 'schedules' });

  const totalCost = useMemo(() => {
    const numbersCost = (watchedNumbers || []).reduce((acc, curr) => acc + (Number(curr?.quantity) || 0), 0) * (watchedSchedules?.length || 0) * costPerFraction;
    const palesCost = (watchedPales || []).reduce((acc, curr) => acc + (Number(curr?.quantity) || 0), 0) * (watchedSchedules?.length || 0);
    return numbersCost + palesCost;
  }, [watchedNumbers, watchedPales, watchedSchedules, costPerFraction]);

  const completedSales = useMemo(() => {
    const combined = [...sales.filter(s => s.drawId === draw?.id.toString()), ...sessionSales];
    return Array.from(new Map(combined.map(s => [s.id || s.ticketId, s])).values()).sort((a, b) => getSaleDate(b.timestamp).getTime() - getSaleDate(a.timestamp).getTime());
  }, [sales, sessionSales, draw]);

  const handleEditSale = (saleToEdit: Sale) => {
    setEditingSale(saleToEdit);
    setActiveTab('sell');
  };

  useEffect(() => {
    if (editingSale) {
      form.reset({ 
        schedules: editingSale.schedules, 
        numbers: editingSale.numbers, 
        pales: editingSale.pales || [],
        clientName: editingSale.clientName || '', 
        clientPhone: editingSale.clientPhone || '' 
      });
      setBulkText(''); setBulkPreview([]); setBulkErrors([]);
    }
  }, [editingSale, form]);

  useEffect(() => {
    if (!draw) return;
    const currentSchedules = form.getValues('schedules');
    const validSchedules = currentSchedules.filter(sch => !closedSchedules.includes(`${draw.id}-${sch}`));
    if (currentSchedules.length !== validSchedules.length) {
      form.setValue('schedules', validSchedules as any, { shouldValidate: true });
    }
  }, [closedSchedules, draw, form]);

  if (!draw) return null;
  const digits = Math.max(1, Number(draw.cif) || 2);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    if (submittingRef.current) return;
    setIsSubmitting(true); submittingRef.current = true;
    try {
      const isAnyClosed = values.schedules.some(sch => closedSchedules.includes(`${draw.id}-${sch}`));
      if (isAnyClosed) { toast.error("Uno o más horarios seleccionados han cerrado."); return; }

      if (editingSale?.id) {
        await updateSale(editingSale.id, { ...values, totalCost });
        toast.success("Venta actualizada");
        setEditingSale(null); form.reset();
      } else {
        const newSale = await addSale({ ticketId: generateTicketId(), drawId: draw.id.toString(), drawName: draw.name, drawLogo: draw.logo, sellerId: 'seller01', costPerFraction, totalCost, receiptUrl: '', ...values });
        if (newSale) setSessionSales(p => [newSale, ...p]);
        toast.success("Venta completada");
        form.reset();
      }
      setBulkText(''); setBulkPreview([]); setBulkErrors([]);
      setActiveTab('history');
    } catch (e: any) {
      toast.error(e.message || "Error al crear la venta");
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
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50">
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
          <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center flex-shrink-0 border border-white/20"><TicketIcon className="w-5 h-5 text-white/60" /></div>
              <h2 className="text-lg font-semibold text-white">{editingSale ? `Editando Venta: ${editingSale.ticketId}` : draw.name}</h2>
            </div>
            <button onClick={editingSale ? () => { setEditingSale(null); form.reset(); setActiveTab('history'); } : onClose} className="p-2 rounded-full hover:bg-white/10"><X className="w-6 h-6 text-white" /></button>
          </header>

          <div className="p-3 border-b border-white/10 flex-shrink-0">
            <div className="flex space-x-1 bg-black/20 p-1 rounded-lg">
              <button onClick={() => setActiveTab('sell')} className={`w-full py-2 text-sm font-medium rounded-md ${activeTab === 'sell' ? 'bg-green-600 text-white shadow' : 'text-white/70 hover:bg-white/10'}`}>{editingSale ? 'Editando' : 'Nueva Venta'}</button>
              <button onClick={() => setActiveTab('history')} className={`w-full py-2 text-sm font-medium rounded-md ${activeTab === 'history' ? 'bg-green-600 text-white shadow' : 'text-white/70 hover:bg-white/10'}`}>{`Historial (${completedSales.length})`}</button>
            </div>
          </div>

          <main className="flex-grow overflow-y-auto p-5">
            {activeTab === 'sell' && (
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                <div className="flex-grow space-y-6">
                  <div>
                    <h4 className="font-medium text-white/90 mb-3">Seleccione Horario(s)</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {schedules.map(schedule => {
                        const isClosed = closedSchedules.includes(`${draw.id}-${schedule}`);
                        const isSelected = watchedSchedules.includes(schedule);
                        return (
                          <label key={schedule} className={`flex items-center space-x-2 p-2.5 rounded-md border transition-all ${isClosed ? 'bg-red-900/40 border-red-800/50 opacity-60 cursor-not-allowed' : isSelected ? 'bg-green-500/15 border-green-500 cursor-pointer' : 'bg-black/20 border-transparent cursor-pointer hover:bg-white/10'}`}>
                            <input type="checkbox" {...form.register('schedules')} value={schedule} className="sr-only" disabled={isClosed} />
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isClosed ? 'border-red-700/50 bg-red-900/30' : isSelected ? 'border-green-400 bg-green-500' : 'border-white/40'}`}>
                              {isClosed ? <X className="w-3 h-3 text-red-500/80" /> : isSelected && <div className="w-1.5 h-1.5 rounded-sm bg-white"></div>}
                            </div>
                            <span className={`text-sm font-medium text-white/90 ${isClosed ? 'line-through text-white/50' : ''}`}>{schedule}</span>
                          </label>
                        );
                      })}
                    </div>
                    {form.formState.errors.schedules && <p className="text-red-500 text-xs mt-2">{form.formState.errors.schedules.message}</p>}
                  </div>

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
                    <div className="bg-black/20 border border-white/10 rounded-xl p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white/90">Pegado rápido (lista)</p>
                          <p className="text-xs text-white/60">Usa formatos como <span className="font-mono">26-6, 25-12</span>. Activa <span className="font-mono">Invertir</span> para <span className="font-mono">10-70</span>.</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button type="button" onClick={() => setInvertList(v => !v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${invertList ? 'bg-orange-600 text-white border-orange-500' : 'bg-white/10 text-white/80 border-white/20'}`}>{invertList ? 'Invertir: ON' : 'Invertir: OFF'}</button>
                          <select value={applyMode} onChange={e => setApplyMode(e.target.value as ApplyMode)} className="bg-black/30 border border-white/20 rounded-lg py-1.5 px-2 text-white text-xs"><option value="add">Agregar</option><option value="replaceAll">Reemplazar</option></select>
                          <select value={duplicatePolicy} onChange={e => setDuplicatePolicy(e.target.value as DuplicatePolicy)} className="bg-black/30 border border-white/20 rounded-lg py-1.5 px-2 text-white text-xs"><option value="sum">Sumar</option><option value="replace">Reemplazar</option><option value="ignore">Ignorar</option></select>
                          <button type="button" onClick={handleProcessBulk} className="bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold py-1.5 px-3 rounded-lg">Procesar</button>
                          <button type="button" onClick={handleApplyBulk} disabled={!bulkText.trim()} className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg disabled:opacity-50">Aplicar</button>
                        </div>
                      </div>
                      <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder="Pega aquí tu lista..." className="w-full min-h-[110px] bg-black/20 border border-white/20 rounded-lg p-3 text-white text-sm"></textarea>
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

                  <div>
                    <h4 className="font-medium text-white/90 mb-3">Añadir Pales</h4>
                    <div className="space-y-3">
                      {paleFields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-3">
                          <input placeholder="Número" {...form.register(`pales.${index}.number`)} maxLength={4} className={`w-full bg-black/20 border rounded-lg p-1.5 px-3 text-white ${form.formState.errors.pales?.[index]?.number ? 'border-red-500' : 'border-white/20'}`} />
                          <input type="number" step="0.10" min="0.10" max="5" placeholder="Cantidad" {...form.register(`pales.${index}.quantity`)} className="w-36 bg-black/20 border-white/20 border rounded-lg py-1.5 px-3 text-white" />
                          <button type="button" onClick={() => removePale(index)} className="p-2 text-red-500/70 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                    {form.formState.errors.pales && <p className="text-red-500 text-xs mt-2">{form.formState.errors.pales.root?.message}</p>}
                    <button type="button" onClick={() => appendPale({ number: '', quantity: 0.10 })} className="mt-4 flex items-center gap-2 text-green-400 hover:text-green-300 text-sm"><PlusCircle className="w-5 h-5" />Añadir Pale</button>
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
                <h3 className="text-lg font-semibold text-white mb-4">Historial para {draw.name}</h3>
                 {isLoading ? <p className="text-center py-8">Cargando historial...</p> : completedSales.length > 0 ? (
                    <div className="space-y-3">
                        {completedSales.map(sale => (
                            <div key={sale.id} className="bg-black/20 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                               <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                        <p className="font-mono text-sm text-white truncate"><span className="font-bold">ID:</span> {sale.ticketId}</p>
                                        <p className="text-xs text-white/60">{getSaleDate(sale.timestamp).toLocaleTimeString()}</p>
                                    </div>
                                    <p className="text-xs text-white/70 mt-1 truncate"><span className="font-semibold">Cliente:</span> {sale.clientName || 'N/A'}</p>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0">
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-green-400">${sale.totalCost.toFixed(2)}</p>
                                        <p className="text-xs text-white/60">{sale.schedules.join(', ')}</p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <ActionMenu sale={sale} onVisualize={() => setViewingReceipt(sale)} onShare={() => {}} onEdit={() => handleEditSale(sale)} onDelete={() => sale.id && deleteSale(sale.id)} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <div className="text-center py-10 px-4 bg-black/20 rounded-lg">
                        <TicketIcon className="mx-auto w-12 h-12 text-white/30"/>
                        <p className="mt-4 text-white/70">No hay ventas registradas para este sorteo.</p>
                    </div>
                 )}
              </div>
            )}
          </main>
        </div>
      </div>
      {viewingReceipt && <Receipt sale={viewingReceipt} drawName={draw.name} onClose={() => setViewingReceipt(null)} businessName={businessName} logoUrl={logoUrl} />}
    </>
  );
};

const ActionMenu: React.FC<{ sale: Sale; onVisualize: () => void; onShare: () => void; onEdit: () => void; onDelete: () => void; }> = ({ onVisualize, onShare, onEdit, onDelete }) => (
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

export default SalesModal;
