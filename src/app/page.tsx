'use client';

import { ArchiveBoxIcon, ChartBarIcon, TicketIcon, BuildingStorefrontIcon, ArrowLeftOnRectangleIcon, TrophyIcon, ShieldCheckIcon, CurrencyDollarIcon, DocumentChartBarIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useBusiness } from '@/contexts/BusinessContext';
import Image from "next/image";
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

// --- COMPONENTES VISUALES (sin cambios estéticos) ---

const LotteryIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <g fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M43,59 C51.836556,59 59,51.836556 59,43 C59,34.163444 51.836556,27 43,27 C34.163444,27 27,34.163444 27,43 C27,51.836556 34.163444,59 43,59 Z M43,51 C47.418278,51 51,47.418278 51,43 C51,38.581722 47.418278,35 43,35 C38.581722,35 35,38.581722 35,43 C35,47.418278 38.581722,51 43,51 Z"/><path fillRule="evenodd" clipRule="evenodd" d="M21,59 C29.836556,59 37,51.836556 37,43 C37,34.163444 29.836556,27 21,27 C12.163444,27 5,34.163444 5,43 C5,51.836556 12.163444,59 21,59 Z M21,51 C25.418278,51 29,47.418278 29,43 C29,38.581722 25.418278,35 21,35 C16.581722,35 13,38.581722 13,43 C13,47.418278 16.581722,51 21,51 Z"/><path fillRule="evenodd" clipRule="evenodd" d="M32,38 C40.836556,38 48,30.836556 48,22 C48,13.163444 40.836556,6 32,6 C23.163444,6 16,13.163444 16,22 C16,30.836556 23.163444,38 32,38 Z M32,30 C36.418278,30 40,26.418278 40,22 C40,17.581722 36.418278,14 32,14 C27.581722,14 24,17.581722 24,22 C24,26.418278 27.581722,30 32,30 Z"/></g>
    </svg>
);

const LoadingView = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-900">
        <div className="flex justify-center items-center h-screen bg-gray-900">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-green-500"></div>
            <p className="text-white mt-4">Cargando...</p>
        </div>
    </div>
);

const DashboardView = ({ businessName, businessLogo, onLogout }: { businessName: string, businessLogo?: string | null, onLogout: () => void }) => {
    const menuItems = [
        { name: 'Ventas', href: '/sales', icon: LotteryIcon },
        { name: 'Sorteos', href: '/draws', icon: TicketIcon },
        { name: 'Ventas del Día', href: '/ventas-del-dia', icon: DocumentChartBarIcon },
        { name: 'Resultados', href: '/resultados', icon: TrophyIcon },
        { name: 'Cierres', href: '/cierres-sorteos', icon: ArchiveBoxIcon },
        { name: 'Finanzas', href: '/finanzas', icon: CurrencyDollarIcon },
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
        <div className="p-8 bg-green-500 rounded-full shadow-lg"><ChartBarIcon className="w-16 h-16 text-white" /></div>
    );

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen pt-12">
            <button onClick={onLogout} className="absolute top-6 right-6 flex items-center gap-2 py-2 px-4 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"><ArrowLeftOnRectangleIcon className='h-5 w-5' /><span>Cerrar Sesión</span></button>
            <header className="flex flex-col items-center justify-center mb-10 text-center">
                {renderLogo()}
                <h1 className="mt-6 text-4xl font-bold text-white">{businessName}</h1>
            </header>
            <main>
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-8">
                    {menuItems.map((item) => (
                        <Link key={item.name} href={item.href} className="flex flex-col items-center p-4 transition-transform duration-300 transform rounded-lg hover:scale-110 hover:bg-white/10 group">
                            <div className="p-4 bg-white/10 rounded-full mb-3"><item.icon className="w-12 h-12 text-green-400 group-hover:text-white transition-colors" /></div>
                            <span className="text-lg font-medium text-white">{item.name}</span>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
};


// --- COMPONENTE CORREGIDO PARA OBTENER DATOS --- 
function UserDashboard() {
    const { logout } = useAuth();
    const { business, loading: businessLoading } = useBusiness(); // FIX: Get the whole 'business' object

    if (businessLoading) {
        return <LoadingView />;
    }

    // FIX: Pass the correct properties from the 'business' object
    return <DashboardView 
        businessName={business?.name || 'Mi Negocio'} 
        businessLogo={business?.logoUrl} 
        onLogout={logout} 
    />;
}


// --- COMPONENTE PRINCIPAL CON LÓGICA DE AUTENTICACIÓN (sin cambios) ---
export default function Home() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    if (authLoading || !user) {
        return <LoadingView />;
    }

    return <UserDashboard />;
}

// Trigger redeploy
