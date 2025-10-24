'use client';

import { useMemo, Fragment, useEffect, useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, PlusCircle, Trash2, Eye, Pencil, Share2, MoreVertical, Clock, ChevronDown, Ticket as TicketIcon } from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import Receipt from './Receipt';
import { usePersistentSales } from '@/hooks/usePersistentSales';
import type { Draw } from '@/contexts/DrawsContext';
import { toast } from 'sonner';
import React from 'react';

const saleFormSchema = (digits: number) => z.object({
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  schedules: z.array(z.string()).min(1, 'Debes seleccionar al menos un sorteo.'),
  numbers: z.array(z.object({
    number: z.string().min(1, 'El número es requerido.'),
    quantity: z.preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.coerce.number().min(1, 'Mínimo 1')
    ),
  })).min(1, 'Añade al menos un número.').refine(
    (numbers) => numbers.every(n => n.number.length === digits),
    { message: `Todos los números deben tener ${digits} dígitos.` }
  ),
});

type SaleFormValues = z.input<ReturnType<typeof saleFormSchema>>;
type SaleOutputData = z.output<ReturnType<typeof saleFormSchema>>;

interface Sale extends SaleOutputData {
  ticketId: string;
  timestamp: string;
  sellerId: string;
  costPerFraction: number;
  totalCost: number;
}

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

const SalesModal: React.FC<SalesModalProps> = ({ draw, onClose, businessName, logoUrl }) => {
  const [activeTab, setActiveTab] = useState('sell');
  const { sales: completedSales, addSale, deleteSale, isLoading, cleanUpExpiredSales } = usePersistentSales<Sale>(draw?.id?.toString());
  const [viewingReceipt, setViewingReceipt] = useState<Sale | null>(null);

  const formSchema = saleFormSchema(draw?.cif || 0);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'all',
    defaultValues: {
      clientName: '',
      clientPhone: '',
      schedules: [],
      numbers: [{ number: '', quantity: undefined }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "numbers",
  });

  const schedules = useMemo(() => draw?.sch || [], [draw]);

  const costPerFraction = draw?.cost || 0.20;
  
  // 🔹 useWatch escucha los cambios en tiempo real
  const watchedNumbers = useWatch({
    control: form.control,
    name: 'numbers',
  });

  const watchedSchedules = useWatch({
    control: form.control,
    name: 'schedules',
  });

  const totalCost = useMemo(() => {
    const totalQuantity = (watchedNumbers || []).reduce((acc, curr) => {
      return acc + (Number(curr?.quantity) || 0);
    }, 0);

    const schedulesCount = (watchedSchedules?.length || 0) > 0 ? watchedSchedules.length : 1;

    return totalQuantity * costPerFraction * schedulesCount;
  }, [watchedNumbers, watchedSchedules, costPerFraction]);

  useEffect(() => {
    if (activeTab === 'history') {
        cleanUpExpiredSales();
    }
  }, [activeTab, cleanUpExpiredSales]);

  if (!draw) return null;

  const onSubmit = (values: SaleOutputData) => {
    const totalQuantity = values.numbers.reduce((acc, curr) => acc + curr.quantity, 0);
    const finalTotalCost = totalQuantity * costPerFraction * values.schedules.length;

    const newSale: Sale = {
      ...values,
      ticketId: generateTicketId(),
      timestamp: new Date().toISOString(),
      sellerId: 'ventas01',
      costPerFraction,
      totalCost: finalTotalCost,
    };

    addSale(newSale);
    toast.success('Venta realizada con éxito');
    form.reset({
      clientName: '',
      clientPhone: '',
      schedules: [],
      numbers: [{ number: '', quantity: undefined }],
    });
    setActiveTab('history');
  };
  
  const handleEditSale = (saleToEdit: Sale) => {
    form.reset({
      clientName: saleToEdit.clientName || '',
      clientPhone: saleToEdit.clientPhone || '',
      schedules: saleToEdit.schedules,
      numbers: saleToEdit.numbers.map(n => ({...n, quantity: Number(n.quantity)}))
    });
    deleteSale(saleToEdit.ticketId);
    setActiveTab('sell');
  };

  const handleDeleteSale = (ticketId: string) => {
    deleteSale(ticketId);
    toast.info('Venta eliminada');
  };

  const handleShareSale = async (saleToShare: Sale) => {
    const shareData = {
      title: `Comprobante de Venta - ${businessName || 'Lotto Hub'}`,
      text: `¡Gracias por tu compra! Aquí está tu comprobante para el sorteo ${draw.name}.\n\nTicket ID: ${saleToShare.ticketId}\nCliente: ${saleToShare.clientName || 'General'}\nTotal: $${saleToShare.totalCost.toFixed(2)}\n\n¡Mucha suerte!`,
    };
    try {
      await navigator.share(shareData);
    } catch (err) {
      toast.error("Error al compartir la venta.");
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50">
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
          <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center flex-shrink-0 border border-white/20"><TicketIcon className="w-5 h-5 text-white/60"/></div>
              <h2 className="text-lg font-semibold text-white">{draw.name}</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors"><X className="w-6 h-6 text-white"/></button>
          </header>

          <div className="p-3 border-b border-white/10 flex-shrink-0">
            <div className="flex space-x-1 bg-black/20 p-1 rounded-lg">
              <button onClick={() => setActiveTab('sell')} className={`w-full py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'sell' ? 'bg-green-600 text-white shadow' : 'text-white/70 hover:bg-white/10'}`}>{form.formState.isDirty ? 'Venta' : 'Vender'}</button>
              <button onClick={() => setActiveTab('history')} className={`w-full py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'history' ? 'bg-green-600 text-white shadow' : 'text-white/70 hover:bg-white/10'}`}>Ventas Realizadas</button>
            </div>
          </div>

          <main className="flex-grow overflow-y-auto p-5">
            {activeTab === 'sell' && (
              <form onSubmit={form.handleSubmit(onSubmit as any)} className="flex flex-col h-full">
                <div className="flex-grow space-y-6">
                  <div>
                    <h4 className="font-medium text-white/90 mb-3">Seleccione Horario</h4>
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {schedules.map(schedule => (
                        <label key={schedule} className={`flex items-center space-x-2 p-2.5 rounded-md cursor-pointer transition-colors ${form.watch('schedules').includes(schedule) ? 'bg-green-500/15 border-green-500' : 'bg-black/20 border-transparent'} border`}>
                          <input type="checkbox" {...form.register('schedules')} value={schedule} className="hidden" />
                          <div className={`w-4 h-4 rounded border-2 ${form.watch('schedules').includes(schedule) ? 'border-green-400 bg-green-500' : 'border-white/40'} flex items-center justify-center`}><div className="w-1.5 h-1.5 rounded-sm bg-white"></div></div>
                          <span className="text-sm font-medium text-white/90">{schedule}</span>
                        </label>
                      ))}
                    </div>
                    {form.formState.errors.schedules && <p className="text-red-500 text-xs mt-2">{form.formState.errors.schedules.message}</p>}
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                          <label htmlFor="clientName" className="block text-xs font-medium text-white/70 mb-1">Nombre Cliente <span className="text-white/50">(Opcional)</span></label>
                          <input type="text" id="clientName" {...form.register('clientName')} className="w-full bg-black/20 border-white/20 border rounded-lg py-1.5 px-3 text-white focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all" />
                      </div>
                      <div>
                          <label htmlFor="clientPhone" className="block text-xs font-medium text-white/70 mb-1">Teléfono Cliente <span className="text-white/50">(Opcional)</span></label>
                          <input type="tel" id="clientPhone" {...form.register('clientPhone')} className="w-full bg-black/20 border-white/20 border rounded-lg py-1.5 px-3 text-white focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all" />
                      </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-white/90 mb-3">Añade Numero</h4>
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-3">
                          <input type="text" placeholder="Número" {...form.register(`numbers.${index}.number`)} maxLength={draw.cif} className={`w-full bg-black/20 border rounded-lg py-1.5 px-3 text-white focus:ring-1 focus:ring-green-500 transition-all ${form.formState.errors.numbers?.[index]?.number ? 'border-red-500' : 'border-white/20'}`} />
                          <input type="number" placeholder="Cantidad" {...form.register(`numbers.${index}.quantity`)} className="w-36 bg-black/20 border-white/20 border rounded-lg py-1.5 px-3 text-white focus:ring-1 focus:ring-green-500 transition-all" />
                          <button type="button" onClick={() => remove(index)} className="p-2 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors disabled:opacity-50" disabled={fields.length <= 1}><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                     {form.formState.errors.numbers && <p className="text-red-500 text-xs mt-2">{form.formState.errors.numbers.message || form.formState.errors.numbers.root?.message}</p>}
                    <button type="button" onClick={() => append({ number: '', quantity: undefined })} className="mt-4 flex items-center gap-2 text-green-400 hover:text-green-300 text-sm font-medium transition-colors"><PlusCircle className="w-5 h-5" />Añadir Número</button>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center">
                    <div>
                        <span className="text-sm text-white/70">Total Venta:</span>
                        <p className="text-2xl font-bold text-green-400">${totalCost.toFixed(2)}</p>
                    </div>
                    <button type="submit" disabled={!form.formState.isValid} className="bg-green-600 text-white font-semibold py-2.5 px-6 rounded-lg shadow-lg transition-all duration-300 disabled:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700">
                      {form.formState.isDirty ? 'Actualizar Venta' : 'Completar Venta'}
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
                {isLoading ? ( <div className="text-center text-white/60 py-10"><p>Cargando ventas...</p></div> ) : 
                completedSales.length > 0 ? (
                  <div className="overflow-x-auto">
                    <div className="min-w-full">
                      {/* Table Header */}
                      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-white/60 border-b border-t border-white/10">
                        <div className="col-span-2">Números</div>
                        <div className="col-span-3">Sorteos</div>
                        <div className="col-span-3">Cliente</div>
                        <div className="col-span-2 text-right">Total</div>
                        <div className="col-span-2 text-center">Acciones</div>
                      </div>
                      {/* Table Body */}
                      <div className="divide-y divide-white/10">
                        {completedSales.map((sale) => (
                          <div key={sale.ticketId} className="grid grid-cols-12 gap-4 px-4 py-3 items-center text-sm text-white/90">
                            <div className="col-span-2 font-semibold">
                              {sale.numbers.map(n => n.number).join(', ')}
                            </div>
                            <div className="col-span-3">
                              {sale.schedules.join(', ')}
                            </div>
                            <div className="col-span-3">
                              <div>{sale.clientName || 'Cliente General'}</div>
                              <div className="text-xs text-white/50">{new Date(sale.timestamp).toLocaleString()}</div>
                            </div>
                            <div className="col-span-2 text-right font-mono text-green-400">
                              ${sale.totalCost.toFixed(2)}
                            </div>
                            <div className="col-span-2 flex justify-center">
                              <ActionMenu 
                                sale={sale} 
                                onVisualize={() => setViewingReceipt(sale)} 
                                onDelete={() => handleDeleteSale(sale.ticketId)} 
                                onShare={() => handleShareSale(sale)} 
                                onEdit={() => handleEditSale(sale)} 
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : ( <div className="text-center text-white/60 py-10 border-t border-dashed border-white/20"><p className="text-sm">No hay ventas registradas.</p></div> )}
              </>
            )}
          </main>
        </div>
      </div>
      
      {viewingReceipt && <Receipt sale={viewingReceipt} drawName={draw.name} onClose={() => setViewingReceipt(null)} businessName={businessName} logoUrl={logoUrl} />}
    </>
  );
};


const ActionMenu: React.FC<{sale: Sale; onVisualize: () => void; onDelete: () => void; onShare: () => void; onEdit: () => void;}> = ({ onVisualize, onDelete, onShare, onEdit }) => {
    return (
        <Menu as="div" className="relative inline-block text-left">
            <Menu.Button className="p-1.5 rounded-full text-white/70 hover:bg-white/20 hover:text-white"><MoreVertical className="w-5 h-5" /></Menu.Button>
            <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                <Menu.Items className="absolute right-0 w-48 mt-2 origin-top-right bg-gray-800 border border-white/20 divide-y divide-white/10 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                    <div className="px-1 py-1">
                        <Menu.Item>{({ active }) => <button onClick={onVisualize} className={`${active ? 'bg-green-600 text-white' : 'text-white/90'} group flex rounded-md items-center w-full px-2 py-2 text-sm`}><Eye className="w-5 h-5 mr-2"/>Visualizar</button>}</Menu.Item>
                        <Menu.Item>{({ active }) => <button onClick={onEdit} className={`${active ? 'bg-green-600 text-white' : 'text-white/90'} group flex rounded-md items-center w-full px-2 py-2 text-sm`}><Pencil className="w-5 h-5 mr-2"/>Editar</button>}</Menu.Item>
                        <Menu.Item>{({ active }) => <button onClick={onShare} className={`${active ? 'bg-green-600 text-white' : 'text-white/90'} group flex rounded-md items-center w-full px-2 py-2 text-sm`}><Share2 className="w-5 h-5 mr-2"/>Compartir</button>}</Menu.Item>
                    </div>
                    <div className="px-1 py-1">
                        <Menu.Item>{({ active }) => <button onClick={onDelete} className={`${active ? 'bg-red-600 text-white' : 'text-red-400'} group flex rounded-md items-center w-full px-2 py-2 text-sm`}><Trash2 className="w-5 h-5 mr-2"/>Eliminar</button>}</Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
};

export default SalesModal;
