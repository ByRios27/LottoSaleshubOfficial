'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownTrayIcon, TrashIcon, PlusCircleIcon, LockClosedIcon, ArrowUturnUpIcon } from '@heroicons/react/24/solid';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import type { Sale } from '@/contexts/SalesContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- HELPERS ---
function formatMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toNumber(value: string | number): number {
    const n = Number(value);
    return isNaN(n) ? 0 : n;
}

function getTodayDocId(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// --- TYPES ---
type Prize = { id: string; name: string; amount: number };
type ClosureStatus = 'open' | 'closed';
type DailyClosure = {
    commissionRate: number;
    manualPrizes: Prize[];
    initialFunds: number;
    houseInjections: number;
    status: ClosureStatus;
    operatorName?: string;
    phoneNumber?: string;
};

type Payout = { 
    totalWin: number;
    date: string; 
};

// --- COMPONENT ---
export default function VentasDelDiaPage() {
  const { user } = useAuth();
  const { business } = useBusiness();

  // --- ESTADO ---
  const [totalSales, setTotalSales] = useState(0);
  const [automaticPrizes, setAutomaticPrizes] = useState(0);
  const [isLoading, setIsLoading] = useState({ sales: true, closure: true });

  const [commissionRate, setCommissionRate] = useState(10);
  const [manualPrizes, setManualPrizes] = useState<Prize[]>([]);
  const [initialFunds, setInitialFunds] = useState(0);
  const [houseInjections, setHouseInjections] = useState(0);
  const [closureStatus, setClosureStatus] = useState<ClosureStatus>('open');
  const [operatorName, setOperatorName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const isClosed = closureStatus === 'closed';

  // --- DATOS INICIALES ---
   useEffect(() => {
    if (user?.displayName) setOperatorName(user.displayName);
    if (business?.phone) setPhoneNumber(business.phone);
  }, [user, business]);

  // --- DATOS: OBTENER DE FIRESTORE ---
  useEffect(() => {
    if (!user) return;
    const todayDocId = getTodayDocId();

    const fetchSalesAndPayouts = async () => {
        setIsLoading(prev => ({ ...prev, sales: true }));
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const salesRef = collection(db, 'users', user.uid, 'sales');
        const salesQuery = query(salesRef, where('timestamp', '>=', Timestamp.fromDate(todayStart)));
        const payoutsRef = collection(db, 'users', user.uid, 'payoutStatus');
        const payoutsQuery = query(payoutsRef, where('date', '==', todayDocId));
        
        try {
            const [salesSnap, payoutsSnap] = await Promise.all([getDocs(salesQuery), getDocs(payoutsQuery)]);
            setTotalSales(salesSnap.docs.reduce((acc, doc) => acc + (doc.data() as Sale).totalCost, 0));
            setAutomaticPrizes(payoutsSnap.docs.reduce((acc, doc) => acc + (doc.data() as Payout).totalWin, 0));
        } catch (error) { console.error("Error fetching sales/payouts:", error); }
        finally { setIsLoading(prev => ({ ...prev, sales: false })); }
    };

    const fetchClosure = async () => {
        setIsLoading(prev => ({ ...prev, closure: true }));
        const closureRef = doc(db, 'users', user.uid, 'dailyClosures', todayDocId);
        try {
            const docSnap = await getDoc(closureRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as DailyClosure;
                setCommissionRate(data.commissionRate || 10);
                setManualPrizes(data.manualPrizes || []);
                setInitialFunds(data.initialFunds || 0);
                setHouseInjections(data.houseInjections || 0);
                setClosureStatus(data.status || 'open');
                if (data.operatorName) setOperatorName(data.operatorName);
                if (data.phoneNumber) setPhoneNumber(data.phoneNumber);
            }
        } catch (error) { console.error("Error fetching closure:", error); }
        finally { setIsLoading(prev => ({ ...prev, closure: false })); }
    };

    fetchSalesAndPayouts();
    fetchClosure();
  }, [user]);

  // --- DATOS: GUARDAR CIERRE EN FIRESTORE ---
  useEffect(() => {
    if (!user || isLoading.closure || isClosed) return;
    const handler = setTimeout(() => {
        const docId = getTodayDocId();
        const closureRef = doc(db, 'users', user.uid, 'dailyClosures', docId);
        const data: DailyClosure = { commissionRate, manualPrizes, initialFunds, houseInjections, status: closureStatus, operatorName, phoneNumber };
        setDoc(closureRef, data, { merge: true }).catch(err => console.error("Error saving closure:", err));
    }, 1000);
    return () => clearTimeout(handler);
  }, [user, commissionRate, manualPrizes, initialFunds, houseInjections, closureStatus, operatorName, phoneNumber, isLoading.closure, isClosed]);

  // --- LÓGICA DE PREMIOS MANUALES ---
  const addManualPrizeRow = () => setManualPrizes([...manualPrizes, { id: `prize-${Date.now()}`, name: '', amount: 0 }]);
  const updateManualPrize = (id: string, field: 'name' | 'amount', value: string | number) => setManualPrizes(manualPrizes.map(p => p.id === id ? { ...p, [field]: field === 'amount' ? toNumber(value) : value } : p));
  const removeManualPrize = (id: string) => setManualPrizes(manualPrizes.filter(p => p.id !== id));

  // --- MÉTRICAS CALCULADAS ---
  const { totalCommission, totalPrizes, netProfit, houseNet, amountToSettle } = useMemo(() => {
    const totalManualPrizes = manualPrizes.reduce((acc, p) => acc + p.amount, 0);
    const totalGeneratedPrizes = automaticPrizes + totalManualPrizes;
    const sellersCommission = totalSales * (commissionRate / 100);
    const finalHouseNet = totalSales - totalGeneratedPrizes - sellersCommission;
    const shouldHave = initialFunds + totalSales + houseInjections - totalGeneratedPrizes - sellersCommission;
    return { totalCommission: sellersCommission, totalPrizes: totalGeneratedPrizes, netProfit: sellersCommission, houseNet: finalHouseNet, amountToSettle: shouldHave };
  }, [totalSales, commissionRate, automaticPrizes, manualPrizes, houseInjections, initialFunds]);

  // --- ACCIONES ---
  const handleSaveClosure = () => { if (window.confirm("¿Seguro que quieres cerrar la caja? No podrás editar los datos de hoy.")) setClosureStatus('closed'); };
  const handleResetDay = async () => {
      if (window.confirm("¿Estás seguro? Se borrarán todos los datos contables de hoy.")) {
        if (!user) return;
        await deleteDoc(doc(db, 'users', user.uid, 'dailyClosures', getTodayDocId()));
        window.location.reload();
      }
  }

  const handleGeneratePdf = () => {
    const doc = new jsPDF();
    const docId = getTodayDocId();
    const pageW = doc.internal.pageSize.getWidth();

    if (business?.logoUrl) {
        try { doc.addImage(business.logoUrl, 'PNG', 14, 12, 25, 25); } 
        catch (e) { console.error("Error adding logo to PDF:", e); }
    }
    
    doc.setFontSize(16); doc.setFont(undefined, 'bold');
    doc.text(business?.name || 'Reporte de Caja', pageW / 2, 20, { align: 'center' });

    doc.setFontSize(10); doc.setFont(undefined, 'normal');
    doc.text(`Operador: ${operatorName || 'N/A'}`, pageW - 14, 16, { align: 'right' });
    doc.text(`Tel: ${phoneNumber || 'N/A'}`, pageW - 14, 22, { align: 'right' });
    doc.text(`Fecha: ${docId}`, pageW - 14, 28, { align: 'right' });

    const startY = 45;
    doc.setFontSize(18); doc.text("Resumen de Operaciones", 14, startY);
    autoTable(doc, { 
        startY: startY + 5, theme: 'striped', styles: { fontSize: 12 },
        head: [[{content: 'Concepto', styles: {fillColor: [38, 38, 38]}}, {content: 'Monto', styles: {fillColor: [38, 38, 38]}}]],
        body: [
            ['Fondo Inicial', formatMoney(initialFunds)],
            ['Ventas Totales Brutas', formatMoney(totalSales)],
            ['Inyecciones de Casa Grande', formatMoney(houseInjections)],
            ['Premios del Día (Automáticos)', formatMoney(automaticPrizes)],
            ['Otros Premios / Gastos (Manuales)', manualPrizes.reduce((acc, p) => acc + p.amount, 0)],
            [{ content: 'Total Premios del Día', styles: { fontStyle: 'bold' } }, { content: formatMoney(totalPrizes), styles: { fontStyle: 'bold' } }],
            ['Tu Comisión', formatMoney(totalCommission)],
            [{ content: 'Ganancia / Pérdida Neta (Casa Grande)', styles: { fontStyle: 'bold' } }, { content: formatMoney(houseNet), styles: { fontStyle: 'bold', textColor: houseNet >= 0 ? [0, 128, 0] : [255, 0, 0] } }],
        ],
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(18); doc.text("Liquidación Final", 14, finalY + 15);
    autoTable(doc, { 
        startY: finalY + 20, theme: 'grid', styles: { fontSize: 14 },
        body: [
            [{ content: 'Dinero a Liquidar a Casa Grande', styles: { fontStyle: 'bold', halign: 'center' } }],
            [{ content: formatMoney(amountToSettle), styles: { fontStyle: 'bold', fontSize: 20, halign: 'center', fillColor: [23, 37, 84], textColor: [255, 255, 255] } }],
        ],
    });
    
    doc.save(`Reporte-Caja-${docId}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="container mx-auto p-4 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowUturnUpIcon className="h-7 w-7" />
          </Link>
          <h1 className="text-3xl font-bold">Supercomputadora de Contabilidad</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-blue-600 text-white"><CardHeader><CardTitle>Ventas Totales</CardTitle></CardHeader><CardContent>{isLoading.sales ? <p className="text-2xl">Cargando...</p> : <p className="text-4xl font-bold">{formatMoney(totalSales)}</p>}</CardContent></Card>
          <Card className="bg-green-500 text-white"><CardHeader><CardTitle>Tu Ganancia (Comisión)</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold">{formatMoney(netProfit)}</p></CardContent></Card>
          <Card className="bg-red-500 text-white"><CardHeader><CardTitle>Total Premios del Día</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold">{formatMoney(totalPrizes)}</p></CardContent></Card>
          <Card className={houseNet >= 0 ? "bg-purple-600 text-white" : "bg-orange-600 text-white"}><CardHeader><CardTitle>Neto Casa Grande</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold">{formatMoney(houseNet)}</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <fieldset disabled={isClosed || isLoading.closure} className="lg:col-span-2 space-y-6">
            <Card className="bg-gray-800 border-gray-700 disabled:opacity-60">
              <CardHeader><CardTitle>Valores del Día</CardTitle><CardDescription>Cifras automáticas y configuraciones manuales.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div><label className="text-sm text-gray-400">Ventas Brutas (Automático)</label><Input type="text" value={formatMoney(totalSales)} readOnly className="bg-gray-700/50 border-gray-600 font-bold" /></div>
                    <div><label className="text-sm text-gray-400">Premios del Día (Automático)</label><Input type="text" value={formatMoney(automaticPrizes)} readOnly className="bg-gray-700/50 border-gray-600 font-bold" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="text-sm text-gray-400">Nombre del Operador</label><Input value={operatorName} onChange={e => setOperatorName(e.target.value)} className="bg-gray-700 border-gray-600" placeholder="Nombre de quien opera"/></div>
                    <div><label className="text-sm text-gray-400">Teléfono de Contacto</label><Input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="bg-gray-700 border-gray-600" placeholder="Teléfono del negocio"/></div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="text-sm text-gray-400">Fondo Inicial del Día</label><Input type="number" value={initialFunds} onChange={e => setInitialFunds(toNumber(e.target.value))} className="bg-gray-700 border-gray-600" /></div>
                    <div><label className="text-sm text-gray-400">Tasa de Comisión (%)</label><Input type="number" value={commissionRate} onChange={e => setCommissionRate(toNumber(e.target.value))} className="bg-gray-700 border-gray-600" /></div>
                    <div><label className="text-sm text-gray-400">Inyecciones de Casa Grande</label><Input type="number" value={houseInjections} onChange={e => setHouseInjections(toNumber(e.target.value))} className="bg-gray-700 border-gray-600" /></div>
                 </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700 disabled:opacity-60">
                <CardHeader className="flex-row items-center justify-between">
                    <div><CardTitle>Otros Premios o Gastos (Manual)</CardTitle><CardDescription>Registra cualquier pago no automático.</CardDescription></div>
                    <Button variant="outline" size="sm" onClick={addManualPrizeRow}><PlusCircleIcon className="w-4 h-4 mr-2"/>Añadir</Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow className="border-b-gray-600"><TableHead>Descripción</TableHead><TableHead className="w-[150px]">Monto</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
                        <TableBody>
                            {manualPrizes.map(prize => (
                                <TableRow key={prize.id} className="border-0">
                                    <TableCell><Input type="text" value={prize.name} onChange={e => updateManualPrize(prize.id, 'name', e.target.value)} className="bg-gray-700 border-gray-600"/></TableCell>
                                    <TableCell><Input type="number" value={prize.amount} onChange={e => updateManualPrize(prize.id, 'amount', e.target.value)} className="bg-gray-700 border-gray-600"/></TableCell>
                                    <TableCell><Button variant="destructive" size="icon" onClick={() => removeManualPrize(prize.id)}><TrashIcon className="w-4 h-4"/></Button></TableCell>
                                </TableRow>
                            ))}
                             {manualPrizes.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-gray-500 py-4">No hay registros manuales.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
          </fieldset>

          <div className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader><CardTitle>Liquidación Final</CardTitle><CardDescription>Este es el resultado neto del día que pertenece a la casa grande.</CardDescription></CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-400 text-sm">Dinero a Liquidar a Casa Grande</p>
                <p className="text-4xl font-bold text-blue-400 py-2">{formatMoney(amountToSettle)}</p>
                <p className="text-xs text-gray-500">Este es el monto que deberías tener para entregar, antes de contar tu caja.</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader><CardTitle>Acciones</CardTitle></CardHeader>
              <CardContent className="flex flex-col space-y-3">
                {isClosed ? (
                    <div className='p-4 text-center bg-yellow-900/50 rounded-lg border border-yellow-700'>
                        <LockClosedIcon className='w-6 h-6 mx-auto text-yellow-500 mb-2'/>
                        <p className='text-sm text-yellow-400'>Caja cerrada. Los datos de hoy están guardados.</p>
                    </div>
                ) : (
                    <Button variant="secondary" onClick={handleSaveClosure} disabled={isLoading.closure}>Guardar y Cerrar Caja</Button>
                )}
                <Button variant="outline" onClick={handleResetDay} disabled={isClosed}>Reiniciar Día</Button>
                <Button onClick={handleGeneratePdf}><ArrowDownTrayIcon className="w-4 h-4 mr-2" /> Generar Reporte PDF</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
