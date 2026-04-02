
'use client';

import { ArchiveBoxIcon, ChartBarIcon, TicketIcon, BuildingStorefrontIcon, ArrowLeftOnRectangleIcon, TrophyIcon, ShieldCheckIcon, DocumentChartBarIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useBusiness } from '@/contexts/BusinessContext';
import Image from "next/image";
import React, { useEffect } from 'react'; // <--- IMPORTACIÓN CORREGIDA
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

// --- Componente de Carga ---
const LoadingView = () => (
    <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
    </div>
);

// --- Vista del Dashboard ---
const DashboardView = ({ businessName, businessLogo }: { businessName: string, businessLogo?: string | null }) => {
    const menuItems = [
        { name: 'Ventas', href: '/', icon: ChartBarIcon }, // Enlace a la nueva página de ventas
        { name: 'Sorteos', href: '/draws', icon: TicketIcon },
        { name: 'Ventas del Día', href: '/ventas-del-dia', icon: DocumentChartBarIcon },
        { name: 'Resultados', href: '/resultados', icon: TrophyIcon },
        { name: 'Cierres', href: '/cierres-sorteos', icon: ArchiveBoxIcon },
        { name: 'Verificación', href: '/verificacion', icon: ShieldCheckIcon },
        { name: 'Negocio', href: '/business', icon: BuildingStorefrontIcon },
    ];

    const renderLogo = () => businessLogo ? (
        <div className="w-32 h-32 relative rounded-full overflow-hidden shadow-lg"><Image
            src={businessLogo}
            alt={`${businessName} logo`}
            priority
            fill
            sizes="128px"
            className="object-cover" /></div>
    ) : (
        <div className="p-8 bg-purple-500 rounded-full shadow-lg"><ChartBarIcon className="w-16 h-16 text-white" /></div>
    );

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen pt-12 text-white">
            <header className="flex flex-col items-center justify-center mb-10 text-center">
                {renderLogo()}
                <h1 className="mt-6 text-4xl font-bold">{businessName}</h1>
                <p className="text-purple-200 mt-2">Panel de Administración</p>
            </header>
            <main>
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-8">
                    {menuItems.map((item) => (
                        <Link key={item.name} href={item.href} className="flex flex-col items-center p-4 transition-transform duration-300 transform rounded-lg hover:scale-110 hover:bg-white/10 group">
                            <div className="p-4 bg-white/10 rounded-full mb-3"><item.icon className="w-12 h-12 text-purple-300 group-hover:text-white transition-colors" /></div>
                            <span className="text-lg font-medium text-center">{item.name}</span>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
};

// --- Componente principal con lógica de datos y autenticación ---
export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const { business, loading: businessLoading } = useBusiness();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    if (authLoading || businessLoading || !user) {
        return <LoadingView />;
    }

    return <DashboardView 
        businessName={business?.name || 'Mi Negocio'} 
        businessLogo={business?.logoUrl} 
    />;
}
