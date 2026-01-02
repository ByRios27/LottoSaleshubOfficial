'use client';

import { useMemo, Fragment, useState } from 'react';
import { useForm, useFieldArray, useWatch, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, PlusCircle, Trash2, Eye, Share2, MoreVertical } from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import Receipt from './Receipt';
import { useSales, Sale } from '@/contexts/SalesContext';
import type { Draw } from '@/contexts/DrawsContext';
import { toast } from 'sonner';
import React from 'react';
import { Ticket as TicketIcon } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

const formSchema = z.object({
  schedules: z.array(z.string()).nonempty("Debes seleccionar al menos un sorteo."),
  numbers: z.array(
    z.object({
      number: z.string().min(1, "El número es requerido."),
      quantity: z.coerce.number().int().min(1, "Mínimo 1"),
    })
  ).nonempty("Añade al menos un número."),
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SalesModalProps {
  draw: Draw | null;
  onClose: () => void;
  businessName?: string;
  logoUrl?: string;
}

const generateTicketId = () => {
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  const timePart = Date.now().toString(36).slice(-4).toUpperCase();
  return `S${timePart}-${randomPart}`;
};

type SaleTimestamp = string | Timestamp | undefined | null;

const getSaleDate = (timestamp: SaleTimestamp): Date => {
  if (!timestamp) return new Date(0);
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return new Date(timestamp as string);
};

/**
 * Parser robusto para listas pegadas:
 * - Acepta: "26-6 25-12, 24-6\n23-6" etc.
 * - Acepta guiones raros: –, —, −
 * - Ignora texto extra alrededor
 * - Normaliza número (padStart) según draw.cif
 */
type ParsedItem = { number: string; quantity: number };
type ParseResult = { items: ParsedItem[]; errors: string[] };

const parseBulkNumbers = (raw: string, digits: number): ParseResult => {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'string') {
    return { items: [], errors: ['Entrada vacía.'] };
  }

  // Normalizar guiones raros y limpiar caracteres invisibles
  const s = raw
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[–—−]/g, '-');

  // Captura: numero (1..digits) - cantidad (1..4 digitos)
  // Nota: cantidad puede ser 1..9999 (ajusta si quieres)
  const re = new RegExp(`\\b(\\d{1,${Math.max(1, digits)}})\\s*-\\s*(\\d{1,4})\\b`, 'g');
  const matches = [...s.matchAll(re)];

  if (matches.length === 0) {
    return { items: [], errors: ['No se detectaron pares con formato "NUM-CANT" (ej: 26-6).'] };
  }

  const items: ParsedItem[] = [];

  for (const m of matches) {
    const numRaw = m[1];
    const qtyRaw = m[2];

    const numInt = Number(numRaw);
    const qtyInt = Number(qtyRaw);

    if (!Number.isInteger(numInt) || numInt < 0) {
      errors.push(`Token inválido: "${m[0]}" (número inválido)`);
      continue;
    }
    if (!Number.isInteger(qtyInt) || qtyInt < 1) {
      errors.push(`Token inválido: "${m[0]}" (cantidad inválida)`);
      continue;
    }

    // Normalizar número según cantidad de cifras del sorteo (draw.cif)
    // Ejemplo cif=2: 9 -> "09"
    // Ejemplo cif=3: 5 -> "005"
    let normalized = String(numInt);
    if (digits > 1) normalized = normalized.padStart(digits, '0');

    // Validación opcional: si excede dígitos, lo marcamos
    if (normalized.length > digits) {
      errors.push(`Token inválido: "${m[0]}" (excede ${digits} cifras)`);
      continue;
    }

    items.push({ number: normalized, quantity: qtyInt });
  }

  return { items, errors };
};

type DuplicatePolicy = 'sum' | 'replace' | 'ignore';
type ApplyMode = 'add' | 'replaceAll';

const mergeRows = (
  existing: ParsedItem[],
  incoming: ParsedItem[],
  duplicatePolicy: DuplicatePolicy
): ParsedItem[] => {
  const map = new Map<string, number>();

  // Cargar existentes
  for (const r of existing) {
    const key = r.number.trim();
    const qty = Number(r.quantity) || 0;
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + qty);
  }

  // Aplicar incoming según política
  for (const r of incoming) {
    const key = r.number.trim();
    const qty = Number(r.quantity) || 0;
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, qty);
      continue;
    }

    if (duplicatePolicy === 'sum') {
      map.set(key, (map.get(key) || 0) + qty);
    } else if (duplicatePolicy === 'replace') {
      map.set(key, qty);
    } else if (duplicatePolicy === 'ignore') {
      // no-op
    }
  }

  // Convertir a array estable
  return [...map.entries()].map(([number, quantity]) => ({ number, quantity }));
};

const SalesModal: React.FC<SalesModalProps> = ({ draw, onClose, businessName, logoUrl }) => {
  const [activeTab, setActiveTab] = useState('sell');
  const { sales, addSale, deleteSale, isLoading } = useSales();
  const [viewingReceipt, setViewingReceipt] = useState<Sale | null>(null);
  const [sessionSales, setSessionSales] = useState<Sale[]>([]);

  // Bulk (pegado)
  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState<ParsedItem[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [duplicatePolicy, setDuplicatePolicy] = useState<DuplicatePolicy>('sum');
  const [applyMode, setApplyMode] = useState<ApplyMode>('add');

  const completedSales = useMemo(() => {
    if (!draw) return [];
    const contextDrawSales = sales.filter(s => s.drawId === draw.id.toString());
    const combined = [...contextDrawSales, ...sessionSales];

    const uniqueSales = Array.from(
      new Map(combined.map(sale => [sale.id || sale.ticketId, sale])).values()
    );

    return uniqueSales.sort((a, b) => {
      const dateA = getSaleDate(a.timestamp as SaleTimestamp);
      const dateB = getSaleDate(b.timestamp as SaleTimestamp);
      return dateB.getTime() - dateA.getTime();
    });
  }, [sales, sessionSales, draw]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "all",
    defaultValues: {
      schedules: [],
      numbers: [{ number: "", quantity: 1 }],
      clientName: "",
      clientPhone: "",
    } as FormValues,
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "numbers",
  });

  const schedules = useMemo(() => draw?.sch || [], [draw]);
  const costPerFraction = draw?.cost || 0.20;

  const watchedNumbers = useWatch({ control: form.control, name: 'numbers' });
  const watchedSchedules = useWatch({ control: form.control, name: 'schedules' });

  const totalCost = useMemo(() => {
    const totalQuantity = (watchedNumbers || []).reduce((acc, curr) => acc + (Number(curr?.quantity) || 0), 0);
    const schedulesCount = (watchedSchedules?.length || 0);
    return totalQuantity * costPerFraction * schedulesCount;
  }, [watchedNumbers, watchedSchedules, costPerFraction]);

  if (!draw) return null;

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    if (!draw) return;

    const newSaleData: Omit<Sale, 'id' | 'timestamp'> = {
      ticketId: generateTicketId(),
      drawId: draw.id.toString(),
      drawName: draw.name,
      drawLogo: draw.logo,
      sellerId: 'ventas01',
      costPerFraction,
      totalCost,
      receiptUrl: '',
      ...values,
    };

    addSale(newSaleData).then(newlyAddedSale => {
      if (newlyAddedSale) {
        setSessionSales(prev => [newlyAddedSale, ...prev]);
      }
      toast.success('Venta realizada con éxito');
      form.reset();
      setBulkText('');
      setBulkPreview([]);
      setBulkErrors([]);
      setActiveTab('history');
    });
  };

  const handleDeleteSale = async (saleId: string) => {
    await deleteSale(saleId);
    setSessionSales(prev => prev.filter(s => s.id !== saleId));
    toast.success("Venta eliminada correctamente");
  };

  const handleShareSale = async (saleToShare: Sale) => {
    const verificationUrl = new URL(
      `/verificacion/${encodeURIComponent(saleToShare.ticketId)}`,
      window.location.origin
    ).href;

    const shareData = {
      title: `Comprobante de Venta - ${businessName || 'Lotto Hub'}`,
      text: `¡Gracias por tu compra! Aquí está tu comprobante para el sorteo ${draw.name}.\n\nTicket ID: ${saleToShare.ticketId}\nCliente: ${saleToShare.clientName || 'General'}\nTotal: $${saleToShare.totalCost.toFixed(2)}\n\nVerifica tu ticket aquí:`,
      url: verificationUrl,
    };

    try {
      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(verificationUrl);
        toast.success("Enlace de verificación copiado al portapapeles.");
      }
    } catch (err) {
      console.error("Error al compartir:", err);
      try {
        await navigator.clipboard.writeText(verificationUrl);
        toast.success("Error al compartir, enlace copiado al portapapeles.");
      } catch (copyErr) {
        toast.error("No se pudo compartir ni copiar el enlace.");
      }
    }
  };

  // ----- Bulk handlers -----
  const handleProcessBulk = () => {
    const result = parseBulkNumbers(bulkText, draw.cif);
    setBulkPreview(result.items);
    setBulkErrors(result.errors);

    if (result.items.length > 0) {
      toast.success(`Detectados ${result.items.length} item(s) en la lista.`);
    } else {
      toast.error('No se detectaron números válidos.');
    }
  };

  const handleApplyBulk = () => {
    if (bulkPreview.length === 0) {
      toast.error('No hay datos procesados para aplicar.');
      return;
    }

    // Filtrar existentes (evitar fila vacía inicial si no se ha llenado)
    const existing = (watchedNumbers || [])
      .map(n => ({ number: (n.number || '').trim(), quantity: Number(n.quantity) || 0 }))
      .filter(n => n.number.length > 0 && n.quantity > 0);

    let next: ParsedItem[] = [];

    if (applyMode === 'replaceAll') {
      // Reemplaza todo con lo pegado, pero también aplica política interna por si vienen repetidos en el pegado
      next = mergeRows([], bulkPreview, duplicatePolicy);
    } else {
      // Agrega a lo existente
      next = mergeRows(existing, bulkPreview, duplicatePolicy);
    }

    // Orden opcional: por número ascendente (útil visualmente)
    next.sort((a, b) => a.number.localeCompare(b.number));

    replace(next.map(r => ({ number: r.number, quantity: r.quantity })));

    // Limpiar preview (opcional). Yo lo dejo para que el usuario lo vea; si prefieres limpiar, descomenta:
    // setBulkText('');
    // setBulkPreview([]);
    toast.success('Lista aplicada correctamente.');
  };
  // -------------------------

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50">
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
          <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center flex-shrink-0 border border-white/20">
                <TicketIcon className="w-5 h-5 text-white/60" />
              </div>
              <h2 className="text-lg font-semibold text-white">{draw.name}</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <X className="w-6 h-6 text-white" />
            </button>
          </header>

          <div className="p-3 border-b border-white/10 flex-shrink-0">
            <div className="flex space-x-1 bg-black/20 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('sell')}
                className={`w-full py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'sell' ? 'bg-green-600 text-white shadow' : 'text-white/70 hover:bg-white/10'}`}
              >
                {form.formState.isDirty ? 'Venta en Progreso' : 'Nueva Venta'}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`w-full py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'history' ? 'bg-green-600 text-white shadow' : 'text-white/70 hover:bg-white/10'}`}
              >
                Historial ({completedSales.length})
              </button>
            </div>
          </div>

          <main className="flex-grow overflow-y-auto p-5">
            {activeTab === 'sell' && (
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                <div className="flex-grow space-y-6">
                  <div>
                    <h4 className="font-medium text-white/90 mb-3">Seleccione Horario(s)</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {schedules.map(schedule => (
                        <label
                          key={schedule}
                          className={`flex items-center space-x-2 p-2.5 rounded-md cursor-pointer transition-colors ${form.watch('schedules').includes(schedule) ? 'bg-green-500/15 border-green-500' : 'bg-black/20 border-transparent'} border`}
                        >
                          <input type="checkbox" {...form.register('schedules')} value={schedule} className="sr-only" />
                          <div className={`w-4 h-4 rounded border-2 ${form.watch('schedules').includes(schedule) ? 'border-green-400 bg-green-500' : 'border-white/40'} flex items-center justify-center`}>
                            <div className="w-1.5 h-1.5 rounded-sm bg-white"></div>
                          </div>
                          <span className="text-sm font-medium text-white/90">{schedule}</span>
                        </label>
                      ))}
                    </div>
                    {form.formState.errors.schedules && (
                      <p className="text-red-500 text-xs mt-2">{form.formState.errors.schedules.message}</p>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="clientName" className="block text-xs font-medium text-white/70 mb-1">
                        Nombre Cliente <span className="text-white/50">(Opcional)</span>
                      </label>
                      <input
                        type="text"
                        id="clientName"
                        {...form.register('clientName')}
                        className="w-full bg-black/20 border-white/20 border rounded-lg py-1.5 px-3 text-white focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="clientPhone" className="block text-xs font-medium text-white/70 mb-1">
                        Teléfono Cliente <span className="text-white/50">(Opcional)</span>
                      </label>
                      <input
                        type="tel"
                        id="clientPhone"
                        {...form.register('clientPhone')}
                        className="w-full bg-black/20 border-white/20 border rounded-lg py-1.5 px-3 text-white focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-white/90 mb-3">Añadir Números</h4>

                    {/* ---- NUEVO BLOQUE: Pegado rápido ---- */}
                    <div className="mb-5 bg-black/20 border border-white/10 rounded-xl p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-sm font-semibold text-white/90">Pegado rápido (lista)</p>
                          <p className="text-xs text-white/60">
                            Pega formatos como: <span className="font-mono">26-6, 25-12 24-6</span> (comas/espacios/saltos de línea).
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={applyMode}
                            onChange={(e) => setApplyMode(e.target.value as ApplyMode)}
                            className="bg-black/30 border border-white/20 rounded-lg py-1.5 px-2 text-white text-xs focus:ring-1 focus:ring-green-500"
                            title="Modo de aplicación"
                          >
                            <option value="add">Agregar a la lista</option>
                            <option value="replaceAll">Reemplazar toda la lista</option>
                          </select>

                          <select
                            value={duplicatePolicy}
                            onChange={(e) => setDuplicatePolicy(e.target.value as DuplicatePolicy)}
                            className="bg-black/30 border border-white/20 rounded-lg py-1.5 px-2 text-white text-xs focus:ring-1 focus:ring-green-500"
                            title="Qué hacer si el número ya existe"
                          >
                            <option value="sum">Duplicados: Sumar</option>
                            <option value="replace">Duplicados: Reemplazar</option>
                            <option value="ignore">Duplicados: Ignorar</option>
                          </select>

                          <button
                            type="button"
                            onClick={handleProcessBulk}
                            className="bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors"
                          >
                            Procesar
                          </button>

                          <button
                            type="button"
                            onClick={handleApplyBulk}
                            disabled={bulkPreview.length === 0}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors disabled:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Aplicar a la lista
                          </button>
                        </div>
                      </div>

                      <textarea
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        placeholder={`Ej:\n26-6 25-12 24-6\n23-6, 21-10\n...`}
                        className="mt-3 w-full min-h-[110px] bg-black/20 border border-white/20 rounded-lg p-3 text-white text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all"
                      />

                      {(bulkErrors.length > 0 || bulkPreview.length > 0) && (
                        <div className="mt-3 grid sm:grid-cols-2 gap-3">
                          <div className="bg-black/20 border border-white/10 rounded-lg p-3">
                            <p className="text-xs font-semibold text-white/80 mb-2">Vista previa</p>
                            {bulkPreview.length > 0 ? (
                              <div className="max-h-32 overflow-y-auto text-xs text-white/80 space-y-1">
                                {bulkPreview.slice(0, 80).map((it, idx) => (
                                  <div key={`${it.number}-${idx}`} className="flex justify-between font-mono">
                                    <span>{it.number}</span>
                                    <span>{it.quantity}</span>
                                  </div>
                                ))}
                                {bulkPreview.length > 80 && (
                                  <p className="text-white/50 text-[11px] mt-2">…mostrando 80 de {bulkPreview.length}</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-white/50">No hay items detectados aún.</p>
                            )}
                            {bulkPreview.length > 0 && (
                              <p className="text-[11px] text-white/50 mt-2">
                                Total cantidades (preview):{' '}
                                <span className="font-mono">
                                  {bulkPreview.reduce((acc, x) => acc + (Number(x.quantity) || 0), 0)}
                                </span>
                              </p>
                            )}
                          </div>

                          <div className="bg-black/20 border border-white/10 rounded-lg p-3">
                            <p className="text-xs font-semibold text-white/80 mb-2">Validación</p>
                            {bulkErrors.length > 0 ? (
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {bulkErrors.slice(0, 10).map((e, idx) => (
                                  <p key={idx} className="text-xs text-red-400">{e}</p>
                                ))}
                                {bulkErrors.length > 10 && (
                                  <p className="text-white/50 text-[11px] mt-2">…{bulkErrors.length - 10} error(es) más</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-green-300/80">Sin errores detectados.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* ---- FIN BLOQUE: Pegado rápido ---- */}

                    {/* ---- BLOQUE ORIGINAL: ingreso manual ---- */}
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-3">
                          <input
                            type="text"
                            placeholder="Número"
                            {...form.register(`numbers.${index}.number`)}
                            maxLength={draw.cif}
                            className={`w-full bg-black/20 border rounded-lg py-1.5 px-3 text-white focus:ring-1 focus:ring-green-500 transition-all ${form.formState.errors.numbers?.[index]?.number ? 'border-red-500' : 'border-white/20'}`}
                          />
                          <input
                            type="number"
                            placeholder="Cantidad"
                            {...form.register(`numbers.${index}.quantity`, { valueAsNumber: true })}
                            className="w-36 bg-black/20 border-white/20 border rounded-lg py-1.5 px-3 text-white focus:ring-1 focus:ring-green-500 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="p-2 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors disabled:opacity-50"
                            disabled={fields.length <= 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {form.formState.errors.numbers && (
                      <p className="text-red-500 text-xs mt-2">{form.formState.errors.numbers.root?.message}</p>
                    )}

                    <button
                      type="button"
                      onClick={() => append({ number: '', quantity: 1 })}
                      className="mt-4 flex items-center gap-2 text-green-400 hover:text-green-300 text-sm font-medium transition-colors"
                    >
                      <PlusCircle className="w-5 h-5" />
                      Añadir Número
                    </button>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center">
                  <div>
                    <span className="text-sm text-white/70">Total Venta:</span>
                    <p className="text-2xl font-bold text-green-400">${totalCost.toFixed(2)}</p>
                  </div>
                  <button
                    type="submit"
                    disabled={!form.formState.isValid}
                    className="bg-green-600 text-white font-semibold py-2.5 px-6 rounded-lg shadow-lg transition-all duration-300 disabled:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700"
                  >
                    Completar Venta
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'history' && (
              <>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-white">Historial de Ventas</h3>
                  <p className="text-sm text-white/60">Un resumen de todas las ventas para {draw.name}.</p>
                </div>

                {isLoading && completedSales.length === 0 ? (
                  <div className="text-center text-white/60 py-10">
                    <p>Cargando ventas...</p>
                  </div>
                ) : completedSales.length > 0 ? (
                  <div className="overflow-x-auto">
                    <div className="min-w-full">
                      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-white/60 border-b border-t border-white/10">
                        <div className="col-span-2">Números</div>
                        <div className="col-span-3">Sorteos</div>
                        <div className="col-span-3">Cliente</div>
                        <div className="col-span-2 text-right">Total</div>
                        <div className="col-span-2 text-center">Acciones</div>
                      </div>

                      <div className="divide-y divide-white/10">
                        {completedSales.map((sale) => (
                          <div key={sale.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center text-sm text-white/90">
                            <div className="col-span-2 font-semibold">
                              {sale.numbers.map(n => n.number).join(', ')}
                            </div>
                            <div className="col-span-3">
                              {sale.schedules.join(', ')}
                            </div>
                            <div className="col-span-3">
                              <div>{sale.clientName || 'Cliente General'}</div>
                              <div className="text-xs text-white/50">{getSaleDate(sale.timestamp as SaleTimestamp).toLocaleString()}</div>
                            </div>
                            <div className="col-span-2 text-right font-mono text-green-400">
                              ${sale.totalCost.toFixed(2)}
                            </div>
                            <div className="col-span-2 flex justify-center">
                              <ActionMenu
                                sale={sale}
                                onVisualize={() => setViewingReceipt(sale)}
                                onShare={() => handleShareSale(sale)}
                                onDelete={() => sale.id && handleDeleteSale(sale.id)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="text-center text-white/60 py-10 border-t border-dashed border-white/20">
                    <p className="text-sm">No hay ventas registradas.</p>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {viewingReceipt && (
        <Receipt
          sale={viewingReceipt}
          drawName={draw.name}
          onClose={() => setViewingReceipt(null)}
          businessName={businessName}
          logoUrl={logoUrl}
        />
      )}
    </>
  );
};

const ActionMenu: React.FC<{
  sale: Sale;
  onVisualize: () => void;
  onShare: () => void;
  onDelete: () => void;
}> = ({ onVisualize, onShare, onDelete }) => {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="p-1.5 rounded-full text-white/70 hover:bg-white/20 hover:text-white">
        <MoreVertical className="w-5 h-5" />
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 w-48 mt-2 origin-top-right bg-gray-800 border border-white/20 divide-y divide-white/10 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
          <div className="px-1 py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onVisualize}
                  className={`${active ? 'bg-green-600 text-white' : 'text-white/90'} group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                >
                  <Eye className="w-5 h-5 mr-2" />Visualizar
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onShare}
                  className={`${active ? 'bg-green-600 text-white' : 'text-white/90'} group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                >
                  <Share2 className="w-5 h-5 mr-2" />Compartir
                </button>
              )}
            </Menu.Item>
          </div>
          <div className="px-1 py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onDelete}
                  className={`${active ? 'bg-red-600 text-white' : 'text-red-400'} group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                >
                  <Trash2 className="w-5 h-5 mr-2" />Eliminar
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default SalesModal;
