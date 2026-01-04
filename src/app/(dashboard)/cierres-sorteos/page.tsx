'use client';

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDraws, Draw } from '@/contexts/DrawsContext';
import { Sale } from '@/contexts/SalesContext';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// =========================
// Helpers
// =========================
const toDateSafe = (ts: any): Date | null => {
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts.toDate();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
};

const getDayRange = (dateStr: string) => {
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(`${dateStr}T23:59:59.999`);
  return { start, end };
};

const padToCif = (v: string, cif: number) => {
  const cleaned = String(v ?? '').replace(/\D/g, '');
  if (!cleaned) return '';
  return cleaned.padStart(cif, '0').slice(-cif);
};

const slugify = (s: string) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w-]/g, '');

const formatMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const getTodayLocal = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
};

const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// =========================
// Types
// =========================
type ConsolidatedRow = { number: string; quantity: number };
type GridRow = { num: string; qty: number | null };

export default function CierresSorteosPage() {
  const { user } = useAuth();
  const { draws } = useDraws();
  const imageExportRef = useRef<HTMLDivElement>(null);

  // Filters
  const [date, setDate] = useState(getTodayLocal);
  const [drawId, setDrawId] = useState('');
  const [schedule, setSchedule] = useState('');

  // Options
  const [operatorName, setOperatorName] = useState('');
  const [operatorPhone, setOperatorPhone] = useState('');

  // Data
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [rows, setRows] = useState<ConsolidatedRow[]>([]);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  useEffect(() => {
    const savedOperatorName = localStorage.getItem('defaultOperatorName');
    const savedOperatorPhone = localStorage.getItem('defaultOperatorPhone');
    if (savedOperatorName) setOperatorName(savedOperatorName);
    if (savedOperatorPhone) setOperatorPhone(savedOperatorPhone);
  }, []);

  const handleOperatorNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setOperatorName(newName);
    localStorage.setItem('defaultOperatorName', newName);
  };

  const handleOperatorPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhone = e.target.value;
    setOperatorPhone(newPhone);
    localStorage.setItem('defaultOperatorPhone', newPhone);
  };

  const selectedDraw: Draw | null = useMemo(
    () => draws.find((d) => d.id === drawId) || null,
    [drawId, draws]
  );

  const totalTimes = useMemo(() => rows.reduce((acc, r) => acc + (r.quantity || 0), 0), [rows]);
  const costPerFraction = useMemo(() => Number(selectedDraw?.cost || 0), [selectedDraw]);
  const totalAmount = useMemo(() => totalTimes * costPerFraction, [totalTimes, costPerFraction]);

  const showPlanillaWarning = useMemo(() => {
    if (!selectedDraw) return false;
    return (selectedDraw.cif || 2) !== 2;
  }, [selectedDraw]);

  const gridData: GridRow[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.number, r.quantity);
    const list: GridRow[] = Array.from({ length: 100 }, (_, i) => {
      const num = String(i).padStart(2, '0');
      const q = map.get(num) || 0;
      return { num, qty: q > 0 ? q : null };
    });
    return list;
  }, [rows]);

  const resetResults = useCallback(() => {
    setRows([]);
    setGeneratedAt(null);
  }, []);

  const loadAndConsolidate = useCallback(async () => {
    if (!user?.uid || !selectedDraw || !date || !schedule) {
      toast.error('Faltan datos', { description: 'Selecciona sorteo, fecha y horario.' });
      return;
    }

    setIsLoading(true);
    const promise = async () => {
      const cif = selectedDraw.cif || 2;
      const { start, end } = getDayRange(date);
      const salesRef = collection(db, 'users', user.uid, 'sales');
      let docs: any[] = [];

      try {
        const qMain = query(
          salesRef, where('drawId', '==', drawId), where('schedules', 'array-contains', schedule),
          where('timestamp', '>=', Timestamp.fromDate(start)), where('timestamp', '<=', Timestamp.fromDate(end))
        );
        docs = (await getDocs(qMain)).docs;
      } catch (err) {
        toast.info('Usando consulta alternativa por falta de índice.');
        const qFallback = query(salesRef, where('drawId', '==', drawId));
        docs = (await getDocs(qFallback)).docs.filter((docSnap) => {
          const data: any = docSnap.data();
          const docDate = toDateSafe(data?.timestamp);
          if (!docDate) return false;
          return (
            (data?.schedules || []).includes(schedule) &&
            docDate.getTime() >= start.getTime() &&
            docDate.getTime() <= end.getTime()
          );
        });
      }

      const totals = new Map<string, number>();
      for (const d of docs) {
        for (const n of (d.data() as Sale)?.numbers || []) {
          const num = padToCif(String((n as any)?.number ?? ''), cif);
          const qty = Number((n as any)?.quantity) || 0;
          if (num && qty > 0) totals.set(num, (totals.get(num) || 0) + qty);
        }
      }

      const consolidated = Array.from(totals.entries())
        .map(([number, quantity]) => ({ number, quantity }))
        .sort((a, b) => a.number.localeCompare(b.number));
      setRows(consolidated);
      setGeneratedAt(new Date());
      return consolidated;
    };

    toast.promise(promise(), {
      loading: 'Generando cierre...',
      success: (c) => `Listo. ${c.length} números consolidados.`,
      error: 'No se pudo generar el cierre.',
      finally: () => setIsLoading(false),
    });
  }, [user?.uid, selectedDraw, date, schedule, drawId]);

  const handleShareOrDownload = useCallback(async () => {
    if (!imageExportRef.current || !selectedDraw || rows.length === 0) {
      toast.error('No hay resultados que compartir.');
      return;
    }

    setIsSharing(true);
    const toastId = toast.loading('Generando imagen...');

    const node = imageExportRef.current;
    const fileName = `cierre_${slugify(selectedDraw.name)}_${date}_${slugify(schedule)}.png`;
    
    // Temporarily make the node visible for capture
    node.style.left = '0px';
    node.style.top = '0px';
    node.style.opacity = '1';

    try {
        // Allow a short time for the browser to render the node
        await new Promise(resolve => setTimeout(resolve, 100));

        const dataUrl = await toPng(node, {
            cacheBust: true,
            pixelRatio: 2,
            backgroundColor: '#ffffff',
        });

        if (isMobileDevice() && navigator.share) {
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const file = new File([blob], fileName, { type: blob.type });

            await navigator.share({
                title: `Cierre: ${selectedDraw.name}`,
                text: `Cierre del ${date} para el sorteo ${selectedDraw.name} a las ${schedule}.`,
                files: [file],
            });
            toast.success('¡Compartido con éxito!', { id: toastId });
        } else {
            const link = document.createElement('a');
            link.download = fileName;
            link.href = dataUrl;
            link.click();
            toast.success('¡Imagen descargada!', { id: toastId });
        }
    } catch (err: any) {
        if (err.name === 'AbortError' || err.name === 'NotAllowedError') {
            console.log('Share action was cancelled by the user.', err.name);
            toast.info('Acción de compartir cancelada.', { id: toastId });
        } else {
            console.error('Error al generar o compartir la imagen:', err);
            toast.error('Hubo un error al procesar la imagen.', { id: toastId });
        }
    } finally {
        // Hide the node again
        node.style.left = '-9999px';
        node.style.top = '-9999px';
        node.style.opacity = '0';
        setIsSharing(false);
    }
}, [selectedDraw, date, schedule, rows.length]);

  const imageExportStyle: React.CSSProperties = {
    position: 'fixed',
    left: '-9999px', 
    top: '-9999px',
    opacity: 0, // Initially hidden
    pointerEvents: 'none',
    background: 'white',
    padding: '24px',
    width: '640px',
    color: '#111827',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    border: '1px solid #e5e7eb',
    zIndex: 9999,
  };
  

  return (
    <>
      <div style={imageExportStyle} ref={imageExportRef}>
        {selectedDraw && rows.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>CIERRE DE SORTEO</h2>
                <p style={{ fontSize: '16px', margin: '4px 0 0', color: '#4b5563' }}>{selectedDraw.name} - {schedule}</p>
                <p style={{ fontSize: '14px', margin: '2px 0 0', color: '#6b7280' }}>{date}</p>
            </div>

            {operatorName && (
                <div style={{ borderTop: '1px dashed #d1d5db', borderBottom: '1px dashed #d1d5db', padding: '8px 0', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#4b5563' }}>
                        Operador: <span style={{ fontWeight: 600, color: '#111827' }}>{operatorName}</span>
                    </p>
                </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700, padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
              <span>Total Tiempos:</span>
              <span>{totalTimes}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: 800, padding: '12px', background: '#10b981', color: 'white', borderRadius: '8px' }}>
              <span>TOTAL VENDIDO:</span>
              <span>{formatMoney(totalAmount)}</span>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', textAlign: 'center' }}>NÚMEROS VENDIDOS</h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: '4px',
                  fontSize: '14px'
                }}>
                  {gridData.map(item => (
                    <div key={item.num} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      background: item.qty ? '#f3f4f6' : 'transparent',
                      border: '1px solid #e5e7eb'
                    }}>
                      <span style={{ fontWeight: 600 }}>{item.num}</span>
                      <span style={{ fontWeight: item.qty ? 700 : 400, color: item.qty ? '#059669' : '#9ca3af' }}>
                        {item.qty ?? '-'}
                      </span>
                    </div>
                  ))}
                </div>
            </div>

            <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: '#9ca3af' }}>
                <p style={{margin: 0}}>Generado el {generatedAt?.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <Card className="bg-white dark:bg-gray-800 shadow-lg border-none">
              <CardHeader><CardTitle className="text-gray-900 dark:text-white">Generador de Cierres</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtros Principales</label>
                  <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); resetResults(); }} className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                  <Select value={drawId} onValueChange={(v) => { setDrawId(v); setSchedule(''); resetResults(); }}>
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"><SelectValue placeholder="Seleccionar sorteo..." /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800">{draws.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={schedule} onValueChange={(v) => { setSchedule(v); resetResults(); }} disabled={!selectedDraw}>
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"><SelectValue placeholder="Seleccionar horario..." /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800">{(selectedDraw?.sch || []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  {showPlanillaWarning && <p className="text-xs text-yellow-600 dark:text-yellow-400 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-700">Este sorteo usa <b>{selectedDraw?.cif} cifras</b>. La planilla está optimizada para 2.</p>}
                </div>
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Opciones de Exportación</label>
                  <div className="space-y-3">
                    <Input value={operatorName} onChange={handleOperatorNameChange} placeholder="Nombre del Operador (default)" className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                    <Input value={operatorPhone} onChange={handleOperatorPhoneChange} placeholder="Teléfono (default)" className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                  </div>
                </div>
                <Button size="lg" className="w-full text-base bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white dark:text-gray-900 font-bold" onClick={loadAndConsolidate} disabled={isLoading}>{isLoading ? 'Generando... ' : 'Generar Cierre'}</Button>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-3">
            <Card className="bg-white dark:bg-gray-800 shadow-lg h-full border-none">
              <CardHeader><CardTitle className="text-gray-900 dark:text-white">Resultados del Cierre</CardTitle></CardHeader>
              <CardContent>
                {!selectedDraw || !schedule ? <div className="flex items-center justify-center h-96 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl"><p>Selecciona sorteo y horario.</p></div>
                  : rows.length === 0 ? <div className="flex items-center justify-center h-96 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl"><p>Aún no hay resultados. Haz clic en "Generar Cierre".</p></div>
                  : (
                    <div className="space-y-4">
                      <div><h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedDraw.name} - {schedule}</h3><p className="text-sm text-gray-600 dark:text-gray-400">{date}</p></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border"><p className="text-sm text-gray-500 dark:text-gray-400">Total Tiempos</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{totalTimes}</p></div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border"><p className="text-sm text-gray-500 dark:text-gray-400">Total Vendido</p><p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatMoney(totalAmount)}</p></div>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border"><h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Números Vendidos</h4><div className="max-h-64 overflow-y-auto pr-2"><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-3 gap-y-2">{rows.map((r) => (<div key={r.number} className="flex items-baseline justify-between rounded-md px-2 py-1 bg-white dark:bg-gray-800 border"><span className="font-mono font-bold text-base text-gray-800 dark:text-gray-100">{r.number}</span><span className="font-mono text-sm text-gray-600 dark:text-gray-400">{r.quantity}</span></div>))}</div></div></div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button size="lg" className="w-full text-base bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={handleShareOrDownload} disabled={isSharing}>{isSharing ? 'Generando...' : 'Compartir'}</Button>
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
