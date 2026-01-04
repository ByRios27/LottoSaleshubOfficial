'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowDownTrayIcon, ShareIcon, TrashIcon } from '@heroicons/react/24/solid';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, writeBatch, getFirestore } from 'firebase/firestore';
import type { Sale } from '@/contexts/SalesContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type DailySummary = {
  date: string;
  totalSales: number;
  totalCommission: number;
  draws: { [key: string]: { name: string; totalSales: number; commission: number } };
};

type PrizeRow = {
  id: string;
  drawName: string;
  amount: number;
};

type DayCashDraft = {
  // Apertura
  fondoCentralApertura: number;
  bancaApertura: number;
  efectivoApertura: number;

  // Movimientos
  centralEnviadoParaPagos: number;
  ajustes: number;

  // Caja actual
  bancaActual: number;
  efectivoActual: number;

  // Premios (por ahora manual para pruebas)
  premiosTotalPagados: number;
  premiosPorSorteo: PrizeRow[];

  // Cierre
  fondoCentralCierre: number;
  bancaCierre: number;
  efectivoCierre: number;
  notaCierre: string;
};

function FinanceSkeleton() {
  return (
    <div className="container mx-auto p-4 md:p-8 animate-pulse">
      <div className="h-8 bg-gray-700 rounded w-1/3 mb-6"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-1 bg-gray-800 border-gray-700 rounded-lg p-6 space-y-4"><div className="h-6 bg-gray-700 rounded w-1/2"></div><div className="h-4 bg-gray-700 rounded w-3/4"></div><div className="h-10 bg-gray-700 rounded w-24"></div></div>
        <div className="bg-gray-800 border-gray-700 rounded-lg p-6 space-y-4"><div className="h-6 bg-gray-700 rounded w-1/2"></div><div className="h-10 bg-gray-700 rounded w-1/3"></div></div>
        <div className="bg-gray-800 border-gray-700 rounded-lg p-6 space-y-4"><div className="h-6 bg-gray-700 rounded w-1/2"></div><div className="h-10 bg-gray-700 rounded w-1/3"></div></div>
      </div>
      <div className="bg-gray-800 border-gray-700 rounded-lg p-6"><div className="h-8 bg-gray-700 rounded w-1/4 mb-4"></div><div className="space-y-2"><div className="h-12 bg-gray-700 rounded"></div><div className="h-12 bg-gray-700 rounded"></div><div className="h-12 bg-gray-700 rounded"></div></div></div>
    </div>
  );
}

function toNumberSafe(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function isoDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function makeStorageKeys(dateKey: string) {
  return {
    draftKey: `finance_cash_draft:${dateKey}`,
    closeKey: `finance_cash_close:${dateKey}`,
  };
}

function loadLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function saveLocal(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // No-op
  }
}

function defaultDraft(): DayCashDraft {
  return {
    fondoCentralApertura: 0,
    bancaApertura: 0,
    efectivoApertura: 0,

    centralEnviadoParaPagos: 0,
    ajustes: 0,

    bancaActual: 0,
    efectivoActual: 0,

    premiosTotalPagados: 0,
    premiosPorSorteo: [],

    fondoCentralCierre: 0,
    bancaCierre: 0,
    efectivoCierre: 0,
    notaCierre: '',
  };
}

// ===== FIX: ya no importamos ./actions. Implementación local (sin romper compilación) =====
async function deleteAllSalesForUserClient(uid: string) {
  // Borra todos los docs de sales del usuario en batches.
  const salesCol = collection(db, 'users', uid, 'sales');
  const q = query(salesCol, orderBy('timestamp', 'desc'));
  const snap = await getDocs(q);

  if (snap.empty) return;

  const firestore = getFirestore(); // por si db no es instancia directa
  let batch = writeBatch(firestore);
  let opCount = 0;

  for (const docSnap of snap.docs) {
    batch.delete(docSnap.ref);
    opCount += 1;

    // Firestore batch limit: 500
    if (opCount === 450) {
      await batch.commit();
      batch = writeBatch(firestore);
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }
}

export default function VentasDelDiaPage() {
  const { user } = useAuth();
  const { businessName, businessLogo: logoUrl } = useBusiness();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState(10);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [cashDraft, setCashDraft] = useState<DayCashDraft>(defaultDraft());
  const [cashLoaded, setCashLoaded] = useState(false);
  const [cashSavedMsg, setCashSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchSalesData = async () => {
      setIsLoading(true);
      const q = query(collection(db, 'users', user.uid, 'sales'), orderBy('timestamp', 'desc'));
      try {
        const querySnapshot = await getDocs(q);
        const salesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp }) as Sale);
        setSales(salesData);
      } catch (error) {
        console.error("Error al obtener las ventas:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSalesData();
  }, [user]);

  const commission = commissionRate / 100;

  const { totalToday, commissionToday, dailyBreakdown } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyMap = new Map<string, DailySummary>();

    sales.forEach(sale => {
      const saleTimestamp = (sale.timestamp as Timestamp).toDate();
      const saleDate = saleTimestamp.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
      const saleCommission = sale.totalCost * commission;

      let daySummary = dailyMap.get(saleDate);
      if (!daySummary) daySummary = { date: saleDate, totalSales: 0, totalCommission: 0, draws: {} };

      daySummary.totalSales += sale.totalCost;
      daySummary.totalCommission += saleCommission;

      let drawSummary = daySummary.draws[sale.drawId];
      if (!drawSummary) drawSummary = { name: sale.drawName, totalSales: 0, commission: 0 };
      drawSummary.totalSales += sale.totalCost;
      drawSummary.commission += saleCommission;

      daySummary.draws[sale.drawId] = drawSummary;
      dailyMap.set(saleDate, daySummary);
    });

    const todayString = today.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    const todaySummary = dailyMap.get(todayString);

    return {
      totalToday: todaySummary?.totalSales || 0,
      commissionToday: todaySummary?.totalCommission || 0,
      dailyBreakdown: Array.from(dailyMap.values()),
    };
  }, [sales, commission]);

  useEffect(() => {
    if (cashLoaded) return;

    const today = new Date();
    const todayKey = isoDateKey(today);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = isoDateKey(yesterday);

    const { draftKey: todayDraftKey } = makeStorageKeys(todayKey);
    const { closeKey: yesterdayCloseKey } = makeStorageKeys(yesterdayKey);

    const savedDraft = typeof window !== 'undefined' ? loadLocal<DayCashDraft>(todayDraftKey) : null;
    if (savedDraft) {
      setCashDraft(savedDraft);
      setCashLoaded(true);
      return;
    }

    const yesterdayClose = typeof window !== 'undefined' ? loadLocal<DayCashDraft>(yesterdayCloseKey) : null;

    const next = defaultDraft();
    if (yesterdayClose) {
      next.fondoCentralApertura = yesterdayClose.fondoCentralCierre || 0;
      next.bancaApertura = yesterdayClose.bancaCierre || 0;
      next.efectivoApertura = yesterdayClose.efectivoCierre || 0;

      next.bancaActual = next.bancaApertura;
      next.efectivoActual = next.efectivoApertura;

      next.bancaCierre = next.bancaActual;
      next.efectivoCierre = next.efectivoActual;
      next.fondoCentralCierre = next.fondoCentralApertura;
    }

    setCashDraft(next);
    setCashLoaded(true);
  }, [cashLoaded]);

  useEffect(() => {
    if (!cashLoaded) return;
    const t = setTimeout(() => {
      const todayKey = isoDateKey(new Date());
      const { draftKey } = makeStorageKeys(todayKey);
      saveLocal(draftKey, cashDraft);
    }, 400);
    return () => clearTimeout(t);
  }, [cashDraft, cashLoaded]);

  const handleDeleteAllSales = async () => {
    if (!user) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteAllSalesForUserClient(user.uid);
      setSales([]);
      setIsDialogOpen(false);
    } catch (error) {
      console.error(error);
      setDeleteError('No se pudieron eliminar las ventas. Inténtalo de nuevo.');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!isDialogOpen) {
      setConfirmationInput('');
      setDeleteError(null);
    }
  }, [isDialogOpen]);

  const generateSalesReport = async (action: 'download' | 'share') => {
    const doc = new jsPDF();
    const date = new Date().toLocaleString();

    if (logoUrl && logoUrl !== 'default') {
      try {
        const response = await fetch(logoUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        await new Promise<void>((resolve, reject) => {
          reader.onload = () => {
            doc.addImage(reader.result as string, 'PNG', 14, 15, 25, 25);
            resolve();
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (e) { console.error("Error al cargar el logo para el PDF:", e); }
    }

    doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.text(businessName || "Reporte de Finanzas", 45, 32);
    doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(100); doc.text(`Fecha de generación: ${date}`, 45, 38);

    let startY = 55;
    for (const day of dailyBreakdown) {
      doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text(day.date, 14, startY);
      startY += 8;

      autoTable(doc, {
        startY,
        body: [
          ['Venta Bruta Total del Día', `$${day.totalSales.toFixed(2)}`],
          [{ content: 'Tu Ganancia Total del Día', styles: { fontStyle: 'bold' } }, { content: `+$${day.totalCommission.toFixed(2)}`, styles: { fontStyle: 'bold' } }]
        ],
        theme: 'grid', styles: { fontSize: 10 }, headStyles: { fillColor: [230, 230, 230] },
      });
      startY = (doc as any).lastAutoTable.finalY + 10;

      const tableHead = [["Sorteo", "Venta Bruta", "Tu Comisión"]];
      const tableBody = Object.values(day.draws).map(d => [d.name, `$${d.totalSales.toFixed(2)}`, `+$${d.commission.toFixed(2)}`]);
      autoTable(doc, {
        startY, head: tableHead, body: tableBody, theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 'white' }, styles: { fontSize: 9 },
      });
      startY = (doc as any).lastAutoTable.finalY + 15;
    }

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i); doc.setFontSize(9); doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.getWidth() / 2, 287, { align: 'center' });
    }

    if (action === 'share' && navigator.share) {
      const blob = doc.output('blob');
      const file = new File([blob], 'Reporte-Finanzas.pdf', { type: 'application/pdf' });
      try { await navigator.share({ title: 'Reporte de Finanzas', files: [file] }); }
      catch (error) { console.error('Error al compartir:', error); doc.save(`${businessName || 'LottoSalesHub'}_Reporte.pdf`); }
    } else {
      doc.save(`${businessName || 'LottoSalesHub'}_Reporte.pdf`);
    }
  };

  const cashMetrics = useMemo(() => {
    const disponibleApertura = (cashDraft.bancaApertura || 0) + (cashDraft.efectivoApertura || 0);
    const disponibleActual = (cashDraft.bancaActual || 0) + (cashDraft.efectivoActual || 0);

    const esperado =
      disponibleApertura +
      (totalToday || 0) +
      (cashDraft.centralEnviadoParaPagos || 0) -
      (cashDraft.premiosTotalPagados || 0) +
      (cashDraft.ajustes || 0);

    const diferencia = disponibleActual - esperado;

    const totalCentralReferencia = (cashDraft.fondoCentralApertura || 0) + (cashDraft.centralEnviadoParaPagos || 0);
    const tuParteEstimada = disponibleActual - totalCentralReferencia;

    return {
      disponibleApertura,
      disponibleActual,
      esperado,
      diferencia,
      totalCentralReferencia,
      tuParteEstimada,
    };
  }, [cashDraft, totalToday]);

  const addPrizeRow = () => {
    setCashDraft(prev => ({
      ...prev,
      premiosPorSorteo: [
        ...prev.premiosPorSorteo,
        { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, drawName: '', amount: 0 }
      ],
    }));
  };

  const updatePrizeRow = (id: string, patch: Partial<PrizeRow>) => {
    setCashDraft(prev => ({
      ...prev,
      premiosPorSorteo: prev.premiosPorSorteo.map(r => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removePrizeRow = (id: string) => {
    setCashDraft(prev => ({
      ...prev,
      premiosPorSorteo: prev.premiosPorSorteo.filter(r => r.id !== id),
    }));
  };

  useEffect(() => {
    const sum = cashDraft.premiosPorSorteo.reduce((acc, r) => acc + (Number.isFinite(r.amount) ? r.amount : 0), 0);
    if (cashDraft.premiosPorSorteo.length > 0) {
      setCashDraft(prev => ({ ...prev, premiosTotalPagados: sum }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashDraft.premiosPorSorteo]);

  const handleSaveClose = () => {
    const todayKey = isoDateKey(new Date());
    const { closeKey } = makeStorageKeys(todayKey);

    const toSave: DayCashDraft = {
      ...cashDraft,
      bancaCierre: cashDraft.bancaCierre || cashDraft.bancaActual || 0,
      efectivoCierre: cashDraft.efectivoCierre || cashDraft.efectivoActual || 0,
      fondoCentralCierre: cashDraft.fondoCentralCierre || cashDraft.fondoCentralApertura || 0,
    };

    saveLocal(closeKey, toSave);
    setCashDraft(toSave);

    setCashSavedMsg(`Cierre guardado para ${todayKey}.`);
    setTimeout(() => setCashSavedMsg(null), 2500);
  };

  const handleResetCashDraft = () => {
    const todayKey = isoDateKey(new Date());
    const { draftKey } = makeStorageKeys(todayKey);
    saveLocal(draftKey, null);
    const next = defaultDraft();
    setCashDraft(next);
    setCashSavedMsg('Borrador reiniciado.');
    setTimeout(() => setCashSavedMsg(null), 2500);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-gray-900 text-white"><main><FinanceSkeleton /></main></div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="container mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-6">Ventas y Caja del Día</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="md:col-span-1 bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle>Tu Comisión</CardTitle>
              <CardDescription>Establece tu porcentaje de ganancia.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Input type="number" value={commissionRate} onChange={(e) => setCommissionRate(Number(e.target.value))} className="w-24 text-lg bg-gray-700 border-gray-600 text-white" />
                <span className="text-lg">%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-600 text-white">
            <CardHeader><CardTitle>Ventas de Hoy</CardTitle></CardHeader>
            <CardContent><p className="text-4xl font-bold">{formatMoney(totalToday)}</p></CardContent>
          </Card>

          <Card className="bg-green-500 text-white">
            <CardHeader><CardTitle>Ganancia de Hoy</CardTitle></CardHeader>
            <CardContent><p className="text-4xl font-bold">{formatMoney(commissionToday)}</p></CardContent>
          </Card>
        </div>

        <Card className="mb-8 bg-gray-800 border-gray-700">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Análisis Diario de Ventas</CardTitle>
              <CardDescription>Un desglose de tus ventas y comisiones por día.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => generateSalesReport('share')} disabled={sales.length === 0}><ShareIcon className="w-4 h-4 mr-2" /> Compartir</Button>
              <Button variant="secondary" onClick={() => generateSalesReport('download')} disabled={sales.length === 0}><ArrowDownTrayIcon className="w-4 h-4 mr-2" /> Descargar</Button>
            </div>
          </CardHeader>
          <CardContent>
            {dailyBreakdown.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {dailyBreakdown.map((day) => (
                  <AccordionItem value={day.date} key={day.date} className="border-b-gray-700">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex justify-between items-center w-full pr-4">
                        <span className="font-bold text-lg">{day.date}</span>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Venta Bruta: {formatMoney(day.totalSales)}</p>
                          <p className="font-semibold text-green-400">Tu Ganancia: +{formatMoney(day.totalCommission)}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b-gray-600">
                            <TableHead>Sorteo</TableHead>
                            <TableHead className="text-right">Venta Bruta</TableHead>
                            <TableHead className="text-right">Tu Comisión</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.values(day.draws).map(draw => (
                            <TableRow key={draw.name} className="border-0">
                              <TableCell>{draw.name}</TableCell>
                              <TableCell className="text-right">{formatMoney(draw.totalSales)}</TableCell>
                              <TableCell className="text-right text-green-400">+{formatMoney(draw.commission)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-center py-8 text-gray-500">No hay ventas registradas para analizar.</p>
            )}
          </CardContent>
        </Card>

        {/* NUEVO: Caja del día (Pruebas) */}
        <Card className="mb-8 bg-gray-800 border-gray-700">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Caja del Día (Pruebas)</CardTitle>
              <CardDescription>
                Control operativo: apertura, fondos de central, premios y arqueo. Se guarda localmente por fecha (modo prueba).
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleSaveClose}>Guardar Cierre</Button>
              <Button variant="outline" onClick={handleResetCashDraft}>Reiniciar Borrador</Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {cashSavedMsg && <div className="text-sm text-green-400">{cashSavedMsg}</div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-base">Apertura</CardTitle>
                  <CardDescription>Normalmente viene del cierre anterior.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-300">Fondo Central (Apertura)</label>
                    <Input type="number" value={cashDraft.fondoCentralApertura} onChange={(e) => setCashDraft(prev => ({ ...prev, fondoCentralApertura: toNumberSafe(e.target.value) }))} className="bg-gray-700 border-gray-600 text-white" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-300">Banca en Línea (Apertura)</label>
                    <Input type="number" value={cashDraft.bancaApertura} onChange={(e) => setCashDraft(prev => ({ ...prev, bancaApertura: toNumberSafe(e.target.value) }))} className="bg-gray-700 border-gray-600 text-white" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-300">Efectivo (Apertura)</label>
                    <Input type="number" value={cashDraft.efectivoApertura} onChange={(e) => setCashDraft(prev => ({ ...prev, efectivoApertura: toNumberSafe(e.target.value) }))} className="bg-gray-700 border-gray-600 text-white" />
                  </div>
                  <div className="pt-2 text-sm text-gray-300">
                    <div className="flex justify-between">
                      <span>Disponible Apertura</span>
                      <span className="font-semibold">{formatMoney(cashMetrics.disponibleApertura)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-700">
                <Card
