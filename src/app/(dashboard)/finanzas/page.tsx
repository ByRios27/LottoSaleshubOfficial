'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowDownTrayIcon, ShareIcon, TrashIcon, ArrowUturnUpIcon } from '@heroicons/react/24/solid';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, doc, getDoc, setDoc } from 'firebase/firestore'; // <-- Imports añadidos
import type { Sale } from '@/contexts/SalesContext';
import { deleteAllSalesForUser } from './actions';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function toNumber(value: string | number): number {
    const n = Number(value);
    return isNaN(n) ? 0 : n;
}

type DailySummary = {
    date: string;
    totalSales: number;
    totalCommission: number;
    draws: { [key: string]: { name: string; totalSales: number; commission: number } };
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

export default function FinanzasPage() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState({ sales: true, settings: true });
  const [commissionRate, setCommissionRate] = useState(10);
  const [isDeleting, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // --- LÓGICA DE DATOS ---
  useEffect(() => {
    if (!user) return;

    const fetchSalesData = async () => {
      setIsLoading(prev => ({ ...prev, sales: true }));
      const q = query(collection(db, 'users', user.uid, 'sales'), orderBy('timestamp', 'desc'));
      try {
        const querySnapshot = await getDocs(q);
        const salesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp }) as Sale);
        setSales(salesData);
      } catch (error) { console.error("Error al obtener las ventas:", error); } 
      finally { setIsLoading(prev => ({ ...prev, sales: false })); }
    };

    const fetchSettings = async () => {
        setIsLoading(prev => ({...prev, settings: true}));
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'main');
        try {
            const docSnap = await getDoc(settingsRef);
            if(docSnap.exists() && docSnap.data().commissionRate) {
                setCommissionRate(docSnap.data().commissionRate);
            }
        } catch (error) {
            console.error("Error al obtener configuraciones:", error);
        } finally {
            setIsLoading(prev => ({...prev, settings: false}));
        }
    };

    fetchSalesData();
    fetchSettings();
  }, [user]);

  // Guardar cambios en la comisión
  useEffect(() => {
    if(isLoading.settings || !user) return;

    const handler = setTimeout(() => {
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'main');
        setDoc(settingsRef, { commissionRate }, { merge: true })
            .catch(err => console.error("Error al guardar la comisión:", err));
    }, 1000); // Debounce de 1 segundo

    return () => clearTimeout(handler);
  }, [commissionRate, user, isLoading.settings]);


  // --- CÁLCULOS ---
  const { totalToday, commissionToday, dailyBreakdown } = useMemo(() => {
    const commission = commissionRate / 100;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyMap = new Map<string, DailySummary>();
    sales.forEach(sale => {
        const saleTimestamp = (sale.timestamp as Timestamp).toDate();
        const saleDate = saleTimestamp.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
        const saleCommission = sale.totalCost * commission;
        let daySummary = dailyMap.get(saleDate);
        if (!daySummary) { daySummary = { date: saleDate, totalSales: 0, totalCommission: 0, draws: {} }; }
        daySummary.totalSales += sale.totalCost;
        daySummary.totalCommission += saleCommission;
        let drawSummary = daySummary.draws[sale.drawId];
        if (!drawSummary) { drawSummary = { name: sale.drawName, totalSales: 0, commission: 0 }; }
        drawSummary.totalSales += sale.totalCost;
        drawSummary.commission += saleCommission;
        daySummary.draws[sale.drawId] = drawSummary;
        dailyMap.set(saleDate, daySummary);
    });
    const todayString = today.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    const todaySummary = dailyMap.get(todayString);
    return { totalToday: todaySummary?.totalSales || 0, commissionToday: todaySummary?.totalCommission || 0, dailyBreakdown: Array.from(dailyMap.values()) };
  }, [sales, commissionRate]);

  // --- ACCIONES ---
  const handleDeleteAllSales = () => {
    if (!user) return;
    setDeleteError(null);
    startTransition(async () => {
      try {
        await deleteAllSalesForUser(user.uid);
        setSales([]);
        setIsDialogOpen(false);
      } catch (error) {
        console.error(error);
        setDeleteError('No se pudieron eliminar las ventas. Inténtalo de nuevo.');
      }
    });
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

    if (business?.logoUrl && business.logoUrl !== 'default') {
        try { doc.addImage(business.logoUrl, 'PNG', 14, 15, 25, 25); } 
        catch (e) { console.error("Error al cargar el logo para el PDF:", e); }
    }
    doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.text(business?.name || "Reporte de Finanzas", 45, 32);
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
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i); doc.setFontSize(9); doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.getWidth() / 2, 287, { align: 'center' });
    }

    if (action === 'share' && navigator.share) {
      const blob = doc.output('blob');
      const file = new File([blob], 'Reporte-Finanzas.pdf', { type: 'application/pdf' });
      try { await navigator.share({ title: 'Reporte de Finanzas', files: [file] }); }
      catch (error) { console.error('Error al compartir:', error); doc.save(`${business?.name || 'LottoSalesHub'}_Reporte.pdf`); }
    } else { doc.save(`${business?.name || 'LottoSalesHub'}_Reporte.pdf`); }
  };

  if (isLoading.sales || isLoading.settings) {
    return <div className="min-h-screen bg-gray-900 text-white"><main><FinanceSkeleton /></main></div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
        <main className="container mx-auto p-4 md:p-8">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                    <ArrowUturnUpIcon className="h-7 w-7" />
                </Link>
                <h1 className="text-3xl font-bold">Tu Centro de Finanzas</h1>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="md:col-span-1 bg-gray-800 border-gray-700"><CardHeader><CardTitle>Tu Comisión</CardTitle><CardDescription>Establece tu porcentaje de ganancia.</CardDescription></CardHeader><CardContent><div className="flex items-center space-x-2"><Input type="number" value={commissionRate} onChange={(e) => setCommissionRate(toNumber(e.target.value))} className="w-24 text-lg bg-gray-700 border-gray-600 text-white" disabled={isLoading.settings}/><span className="text-lg">%</span></div></CardContent></Card>
              <Card className="bg-blue-600 text-white"><CardHeader><CardTitle>Ventas de Hoy</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold">${totalToday.toFixed(2)}</p></CardContent></Card>
              <Card className="bg-green-500 text-white"><CardHeader><CardTitle>Ganancia de Hoy</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold">${commissionToday.toFixed(2)}</p></CardContent></Card>
          </div>

          <Card className="mb-8 bg-gray-800 border-gray-700">
            <CardHeader className="flex-row items-center justify-between"><div><CardTitle>Análisis Diario de Ventas</CardTitle><CardDescription>Un desglose de tus ventas y comisiones por día.</CardDescription></div>
              <div className="flex gap-2">
                  <Button variant="outline" onClick={() => generateSalesReport('share')} disabled={sales.length === 0}><ShareIcon className="w-4 h-4 mr-2"/> Compartir</Button>
                  <Button variant="secondary" onClick={() => generateSalesReport('download')} disabled={sales.length === 0}><ArrowDownTrayIcon className="w-4 h-4 mr-2"/> Descargar</Button>
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
                                            <p className="text-sm text-gray-400">Venta Bruta: ${day.totalSales.toFixed(2)}</p>
                                            <p className="font-semibold text-green-400">Tu Ganancia: +${day.totalCommission.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <Table>
                                        <TableHeader><TableRow className="border-b-gray-600"><TableHead>Sorteo</TableHead><TableHead className="text-right">Venta Bruta</TableHead><TableHead className="text-right">Tu Comisión</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {Object.values(day.draws).map(draw => (
                                                <TableRow key={draw.name} className="border-0">
                                                    <TableCell>{draw.name}</TableCell>
                                                    <TableCell className="text-right">${draw.totalSales.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right text-green-400">+${draw.commission.toFixed(2)}</TableCell>
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

          <Card className="border-red-500/30 bg-red-500/10">
              <CardHeader><CardTitle className="text-red-400">Zona de Peligro</CardTitle><CardDescription className="text-red-400/80">Esta acción es irreversible y no se puede deshacer.</CardDescription></CardHeader>
              <CardContent>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild><Button variant="destructive" className="w-full md:w-auto"><TrashIcon className="w-4 h-4 mr-2"/> Restablecer Ventas</Button></DialogTrigger>
                      <DialogContent className="bg-gray-800 border-gray-700 text-white">
                          <DialogHeader><DialogTitle className="text-red-400">¿Estás absolutamente seguro?</DialogTitle><DialogDescription>Se borrarán permanentemente **todas** las ventas de tu cuenta. Para confirmar, escribe **BORRAR** en el campo de texto.</DialogDescription></DialogHeader>
                          <div className="py-4 space-y-4">
                              <Input placeholder="Escribe BORRAR para confirmar" value={confirmationInput} onChange={(e) => setConfirmationInput(e.target.value)} className="bg-gray-700 border-gray-600 text-white"/>
                              <Button variant="destructive" className="w-full" onClick={handleDeleteAllSales} disabled={confirmationInput !== 'BORRAR' || isDeleting}>
                                  {isDeleting ? 'Borrando ventas...' : 'Entiendo las consecuencias, borrar todo'}
                              </Button>
                              {deleteError && <p className="text-sm text-red-400 text-center">{deleteError}</p>}
                          </div>
                      </DialogContent>
                  </Dialog>
              </CardContent>
          </Card>
        </main>
    </div>
  );
}
