'use client';

import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowDownTrayIcon, ArrowUturnUpIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, doc, getDoc } from 'firebase/firestore';
import type { Sale } from '@/contexts/SalesContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- HELPERS ---
function formatMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export default function ReportesPage() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const handleGenerateReport = async () => {
    if (!user || !selectedDate) {
      alert('Por favor, selecciona una fecha.');
      return;
    }
    setLoading(true);
    setReportData(null);

    try {
      const date = new Date(selectedDate);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const docId = `${year}-${month}-${day}`;

      const startOfDay = new Date(Date.UTC(year, date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
      const endOfDay = new Date(Date.UTC(year, date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));

      // Fetch Sales
      const salesRef = collection(db, 'users', user.uid, 'sales');
      const salesQuery = query(salesRef, 
        where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
        where('timestamp', '<=', Timestamp.fromDate(endOfDay))
      );
      const salesSnapshot = await getDocs(salesQuery);
      const totalSales = salesSnapshot.docs.reduce((acc, doc) => acc + (doc.data() as Sale).totalCost, 0);

      // Fetch Automatic Prizes
      const payoutsRef = collection(db, 'users', user.uid, 'payoutStatus');
      const payoutsQuery = query(payoutsRef, where('date', '==', docId));
      const payoutsSnapshot = await getDocs(payoutsQuery);
      const automaticPrizes = payoutsSnapshot.docs.reduce((acc, doc) => acc + (doc.data() as { totalWin: number }).totalWin, 0);

      // Fetch Daily Closure Data
      const closureRef = doc(db, 'users', user.uid, 'dailyClosures', docId);
      const closureSnap = await getDoc(closureRef);

      if (!closureSnap.exists()) {
          alert("No se encontraron datos de cierre para la fecha seleccionada.");
          setLoading(false);
          return;
      }
      
      const closureData = closureSnap.data() as DailyClosure;

      const dataForPdf = {
          docId,
          businessName: business?.name || 'Reporte de Caja',
          operatorName: closureData.operatorName || user.displayName || 'N/A',
          phoneNumber: closureData.phoneNumber || business?.phone || 'N/A',
          initialFunds: closureData.initialFunds || 0,
          totalSales,
          houseInjections: closureData.houseInjections || 0,
          automaticPrizes,
          manualPrizes: closureData.manualPrizes || [],
          commissionRate: closureData.commissionRate || 10,
          logoUrl: business?.logoUrl,
      };
      
      setReportData(dataForPdf);
      generatePdf(dataForPdf);

    } catch (error) {
      console.error("Error generando el reporte:", error);
      alert("Ocurrió un error al generar el reporte. Revisa la consola para más detalles.");
    } finally {
      setLoading(false);
    }
  };

  const generatePdf = async (data: any) => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    if (data.logoUrl) {
        try {
            const response = await fetch(data.logoUrl);
            const logoArrayBuffer = await response.arrayBuffer();
            const logoUint8Array = new Uint8Array(logoArrayBuffer);
            doc.addImage(logoUint8Array, 'PNG', 14, 12, 25, 25);
        } catch (e) {
            console.error("Error adding logo to PDF:", e);
        }
    }
    
    doc.setFontSize(16); doc.setFont('Helvetica', 'bold');
    doc.text(data.businessName, pageW / 2, 20, { align: 'center' });

    doc.setFontSize(10); doc.setFont('Helvetica', 'normal');
    doc.text(`Operador: ${data.operatorName}`, pageW - 14, 16, { align: 'right' });
    doc.text(`Tel: ${data.phoneNumber}`, pageW - 14, 22, { align: 'right' });
    doc.text(`Fecha: ${data.docId}`, pageW - 14, 28, { align: 'right' });

    const totalManualPrizes = data.manualPrizes.reduce((acc: number, p: Prize) => acc + p.amount, 0);
    const totalPrizes = data.automaticPrizes + totalManualPrizes;
    const totalCommission = data.totalSales * (data.commissionRate / 100);
    const houseNet = data.totalSales - totalPrizes - totalCommission;
    const amountToSettle = data.initialFunds + data.totalSales + data.houseInjections - totalPrizes - totalCommission;

    const startY = 45;
    doc.setFontSize(18); doc.text("Resumen de Operaciones", 14, startY);
    autoTable(doc, { 
        startY: startY + 5, theme: 'striped', styles: { fontSize: 12 },
        head: [[{content: 'Concepto', styles: {fillColor: [38, 38, 38]}}, {content: 'Monto', styles: {fillColor: [38, 38, 38]}}]],
        body: [
            ['Fondo Inicial', formatMoney(data.initialFunds)],
            ['Ventas Totales Brutas', formatMoney(data.totalSales)],
            ['Inyecciones de Casa Grande', formatMoney(data.houseInjections)],
            ['Premios del Día (Automáticos)', formatMoney(data.automaticPrizes)],
            ['Otros Premios / Gastos (Manuales)', formatMoney(totalManualPrizes)],
            [{ content: 'Total Premios del Día', styles: { fontStyle: 'bold' } }, { content: formatMoney(totalPrizes), styles: { fontStyle: 'bold' } }],
            ['Comisión del Vendedor', formatMoney(totalCommission)],
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
    
    doc.save(`Reporte-Caja-${data.docId}.pdf`);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="container mx-auto p-4 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowUturnUpIcon className="h-7 w-7" />
          </Link>
          <h1 className="text-3xl font-bold">Generar Reporte de Días Anteriores</h1>
        </div>

        <Card className="max-w-md mx-auto bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle>Selecciona una Fecha</CardTitle>
            <CardDescription>Elige una fecha para la cual exista un cierre de caja guardado.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white" 
            />
            <Button onClick={handleGenerateReport} disabled={loading || !selectedDate}>
              <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
              {loading ? 'Generando...' : 'Generar Reporte PDF'}
            </Button>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
