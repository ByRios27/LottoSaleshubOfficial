'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext'; // Import the Auth context
import { useBusiness } from '@/contexts/BusinessContext';
import { ArrowDownTrayIcon } from '@heroicons/react/24/solid';

// --- HELPER FUNCTION ---
function getTodayDocId(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// --- TYPES ---
interface Closure {
    id: string;
    closureDate: string;
    totalSales: number;
    totalCommission: number;
    totalPrizes: number;
    houseNet: number;
    amountToSettle: number;
    operatorName?: string;
}

// --- COMPONENT ---
export default function PreviousClosuresPage() {
    const { user, loading: authLoading } = useAuth(); // Get user and auth loading state
    const { business, loading: businessLoading } = useBusiness(); // Get business data
    const [closures, setClosures] = useState<Closure[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // The business ID is the user's UID.
        // We wait until we have the user ID to proceed.
        if (authLoading || businessLoading || !user?.uid) {
            return;
        }

        const fetchClosures = async () => {
            try {
                const todayStr = getTodayDocId();
                // Use user.uid as the businessId
                const closuresRef = collection(db, 'businesses', user.uid, 'closures');
                
                const q = query(
                    closuresRef, 
                    where("closureDate", "<", todayStr),
                    orderBy("closureDate", "desc")
                );

                const querySnapshot = await getDocs(q);
                const closuresData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Closure));
                
                setClosures(closuresData);
            } catch (error) {
                console.error("Error fetching previous closures: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchClosures();
    }, [user, authLoading, businessLoading]); // Dependency array updated

    const handleDownload = () => {
        const header = ["ID del Cierre", "Fecha", "Ventas Totales", "Comisión", "Premios", "Neto Casa", "A Liquidar"];
        const rows = closures.map(c => [
            c.id,
            c.closureDate,
            `$${c.totalSales.toLocaleString('es-CO')}`,
            `$${c.totalCommission.toLocaleString('es-CO')}`,
            `$${c.totalPrizes.toLocaleString('es-CO')}`,
            `$${c.houseNet.toLocaleString('es-CO')}`,
            `$${c.amountToSettle.toLocaleString('es-CO')}`
        ]);

        let csvContent = header.join(",") + "\n";
        rows.forEach(rowArray => {
            let row = rowArray.join(",");
            csvContent += row + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `historial_cierres_${business?.name || 'negocio'}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading || authLoading || businessLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-white">Cargando historial...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 text-white">
            <h1 className="text-3xl font-bold mb-6 text-center">Historial de Cierres</h1>
            <div className="flex justify-center mb-6">
                <Button onClick={handleDownload} disabled={closures.length === 0} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105">
                    <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                    Descargar CSV
                </Button>
            </div>
            <div className="overflow-x-auto shadow-2xl rounded-lg">
                <table className="min-w-full bg-white/10 backdrop-blur-md">
                    <thead className="bg-white/20">
                        <tr>
                            <th className="py-3 px-6 text-left text-sm font-semibold uppercase tracking-wider">Fecha</th>
                            <th className="py-3 px-6 text-right text-sm font-semibold uppercase tracking-wider">Ventas</th>
                            <th className="py-3 px-6 text-right text-sm font-semibold uppercase tracking-wider">Comisión</th>
                            <th className="py-3 px-6 text-right text-sm font-semibold uppercase tracking-wider">Premios</th>
                            <th className="py-3 px-6 text-right text-sm font-semibold uppercase tracking-wider">Neto Casa</th>
                            <th className="py-3 px-6 text-right text-sm font-semibold uppercase tracking-wider">A Liquidar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {closures.length > 0 ? (
                            closures.map(c => (
                                <tr key={c.id} className="border-b border-white/10 hover:bg-white/20 transition-colors">
                                    <td className="py-4 px-6 text-left whitespace-nowrap font-mono text-sm">{c.closureDate}</td>
                                    <td className="py-4 px-6 text-right font-semibold">${c.totalSales.toLocaleString('es-CO')}</td>
                                    <td className="py-4 px-6 text-right font-semibold">${c.totalCommission.toLocaleString('es-CO')}</td>
                                    <td className="py-4 px-6 text-right text-red-400 font-semibold">${c.totalPrizes.toLocaleString('es-CO')}</td>
                                    <td className={`py-4 px-6 text-right font-bold ${c.houseNet >= 0 ? 'text-green-400' : 'text-orange-400'}`}>${c.houseNet.toLocaleString('es-CO')}</td>
                                    <td className="py-4 px-6 text-right font-bold text-blue-400">${c.amountToSettle.toLocaleString('es-CO')}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="text-center py-10">No hay cierres anteriores disponibles.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
