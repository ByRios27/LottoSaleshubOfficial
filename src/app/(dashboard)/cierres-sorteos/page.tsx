'use client';

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDraws, Draw } from '@/contexts/DrawsContext';
import { Sale } from '@/contexts/SalesContext';
import { toast } from 'sonner';

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

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toPng } from 'html-to-image';

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


// =========================
// Types
// =========================
type ConsolidatedRow = { number: string; quantity: number };
type GridRow = { num: string; qty: number | null };

export default function CierresSorteosPage() {
  const { user } = useAuth();
  const { draws } = useDraws();
  const imageExportRef = useRef<HTMLDivElement>(null);

  // Filtros
  const [date, setDate] = useState(getTodayLocal);
  const [drawId, setDrawId] = useState('');
  const [schedule, setSchedule] = useState('');

  // Opcionales
  const [operatorName, setOperatorName] = useState('');
  const [operatorPhone, setOperatorPhone] = useState('');
  const [columns, setColumns] = useState<'2' | '3'>('3');
  const [showBlankAsDash, setShowBlankAsDash] = useState(true);

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

  const downloadPdf = useCallback(async () => {
    if (!selectedDraw || rows.length === 0) {
      toast.error('No hay datos para exportar.');
      return;
    }

    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 30;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(`Cierre: ${selectedDraw.name}`, marginX, 45);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Fecha: ${date}   Horario: ${schedule}`, marginX, 62);

    if (operatorName?.trim()) {
      doc.text(`Operador: ${operatorName.trim()}${operatorPhone?.trim() ? ` (${operatorPhone.trim()})` : ''}`,
        marginX, 76);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Total Tiempos: ${totalTimes}`, marginX, 100);
    doc.text(`Total Vendido: ${formatMoney(totalAmount)}`, pageWidth - marginX, 100, { align: 'right' });

    const blocks = columns === '2' ? 2 : 3;
    const perBlock = Math.ceil(gridData.length / blocks);
    const chunk = (arr: GridRow[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
    const parts = chunk(gridData, perBlock);
    const maxRows = Math.max(...parts.map(p => p.length));

    const head = Array(blocks).fill(['Núm', 'Tiempos']).flat();
    const body = Array.from({ length: maxRows }, (_, i) => {
      const r: string[] = [];
      for (let b = 0; b < blocks; b++) {
        const item = parts[b]?.[i];
        r.push(item?.num ?? '', item?.qty === null ? (showBlankAsDash ? '—' : '') : String(item?.qty ?? ''));
      }
      return r;
    });

    autoTable(doc, {
      startY: 112,
      head: [head],
      body,
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 3.5, halign: 'center' },
      headStyles: { fontStyle: 'bold', fillColor: '#F1F5F9', textColor: '#000' },
      columnStyles: {
        ...Array.from({ length: blocks }, (_, b) => b * 2).reduce((acc, i) => ({ ...acc, [i]: { fontStyle: 'bold', fontSize: 10 } }), {})
      },
      didDrawPage: () => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`Generado: ${(generatedAt ?? new Date()).toLocaleString()}`, pageWidth - marginX, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
      }
    });

    doc.save(`cierre_${slugify(selectedDraw.name)}_${date}_${slugify(schedule)}.pdf`);
    toast.success('PDF descargado.');
  }, [selectedDraw, date, schedule, rows, totalTimes, totalAmount, operatorName, operatorPhone, columns, showBlankAsDash, generatedAt, gridData]);


  const shareAsImage = useCallback(async () => {
    if (!imageExportRef.current || !selectedDraw || rows.length === 0) {
      toast.error('No hay resultados que compartir.');
      return;
    }

    setIsSharing(true);
    const toastId = toast.loading('Generando imagen...');

    const node = imageExportRef.current;
    const fileName = `cierre_${slugify(selectedDraw.name)}_${date}_${slugify(schedule)}.png`;

    try {
      // 2 frames para asegurar render
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await new Promise<void>((r) => requestAnimationFrame(() => r()));

      const rect = node.getBoundingClientRect();
      const width = Math.max(600, Math.round(rect.width || node.offsetWidth || 600));
      const height = Math.max(800, Math.round(rect.height || node.offsetHeight || 800));

      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        style: {
          position: 'fixed',
          left: '0px',
          top: '0px',
          opacity: '1',
          visibility: 'visible',
          transform: 'none',
          filter: 'none',
          pointerEvents: 'none',
          zIndex: '2147483647',
        },
        width,
        height,
      });

      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('¡Imagen descargada!', { id: toastId });
    } catch (err) {
      console.error('Error al generar la imagen:', err);
      toast.error('Hubo un error al generar la imagen.', { id: toastId });
    } finally {
      setIsSharing(false);
    }
  }, [selectedDraw, date, schedule, rows.length]);

  const imageExportStyle: React.CSSProperties = {
    position: 'fixed',
    left: '0px',
    top: '0px',
    opacity: 0,
    pointerEvents: 'none',
    background: 'white',
    padding: '20px',
    width: '600px',
    zIndex: -1,
  };

  return (
    <>
      <div style={imageExportStyle} ref={imageExportRef}>
        {selectedDraw && rows.length > 0 && (
          <div style={{ fontFamily: 'sans-serif', color: 'black' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Cierre: {selectedDraw.name}</h2>
            <p style={{ fontSize: '16px', margin: '4px 0 12px' }}>{date} - {schedule}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', borderTop: '1px solid #ccc', borderBottom: '1px solid #ccc', padding: '10px 0' }}>
              <span>Total Tiempos: {totalTimes}</span>
              <span style={{color: '#16A34A'}}>{formatMoney(totalAmount)}</span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              borderTop: '1px solid #ccc',
              borderLeft: '1px solid #ccc',
              marginTop: '16px',
              fontSize: '14px'
            }}>
              {gridData.map(item => (
                <div key={item.num} style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '4px',
                  borderBottom: '1px solid #ccc',
                  borderRight: '1px solid #ccc'
                }}>
                  <span style={{ fontWeight: 'bold' }}>{item.num}</span>
                  <span style={{ color: 'blue', fontWeight: 'bold' }}>{item.qty ?? '—'}</span>
                </div>
              ))}
            </div>
            {operatorName && <p style={{marginTop: '15px', fontSize: '12px', color: '#555'}}>Operador: {operatorName}</p>}
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
                    <Select value={columns} onValueChange={(v) => setColumns(v as '2' | '3')}><SelectTrigger className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"><SelectValue placeholder="Columnas en PDF" /></SelectTrigger><SelectContent className="bg-white dark:bg-gray-800"><SelectItem value="2">2 columnas</SelectItem><SelectItem value="3">3 columnas</SelectItem></SelectContent></Select>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700"><span className="text-sm text-gray-800 dark:text-gray-200">No vendidos como "—"</span><input type="checkbox" className="h-5 w-5 rounded text-green-600 focus:ring-green-500" checked={showBlankAsDash} onChange={(e) => setShowBlankAsDash(e.target.checked)} /></div>
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
                        <Button size="lg" className="w-full text-base bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={downloadPdf}>Descargar PDF</Button>
                        <Button size="lg" className="w-full text-base bg-gray-700 hover:bg-gray-600 text-white font-bold" onClick={shareAsImage} disabled={isSharing}>{isSharing ? 'Generando...' : 'Compartir Imagen'}</Button>
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
