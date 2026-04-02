
'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import Image from 'next/image';
import { XMarkIcon, ArchiveBoxIcon, ChartBarIcon, TicketIcon, BuildingStorefrontIcon, ArrowLeftOnRectangleIcon, TrophyIcon, ShieldCheckIcon, DocumentChartBarIcon } from '@heroicons/react/24/solid';

const menuItems = [
    { name: 'Ventas', href: '/sales', icon: ChartBarIcon },
    { name: 'Sorteos', href: '/draws', icon: TicketIcon },
    { name: 'Ventas del Día', href: '/ventas-del-dia', icon: DocumentChartBarIcon },
    { name: 'Resultados', href: '/resultados', icon: TrophyIcon },
    { name: 'Cierres', href: '/cierres-sorteos', icon: ArchiveBoxIcon },
    { name: 'Verificación', href: '/verificacion', icon: ShieldCheckIcon },
    { name: 'Negocio', href: '/business', icon: BuildingStorefrontIcon },
];

interface SideMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SideMenu({ isOpen, onClose }: SideMenuProps) {
    const { logout } = useAuth();
    const { business } = useBusiness();

    const handleLogout = () => {
        onClose();
        logout();
    };

    return (
        <>
            {/* Overlay */}
            <div 
                className={`fixed inset-0 bg-black/60 z-[70] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Contenido del Menú */}
            <div className={`fixed top-0 left-0 h-full w-72 bg-gray-800 shadow-2xl z-[80] transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    {/* Cabecera del Menú */}
                    <header className="flex items-center justify-between p-4 border-b border-gray-700">
                        <div className="flex items-center gap-3">
                            {business?.logoUrl ? (
                                <div className="w-10 h-10 relative rounded-full overflow-hidden"><Image src={business.logoUrl} alt="Logo" layout="fill" objectFit="cover" /></div>
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-green-500"></div>
                            )}
                            <span className="text-white font-semibold text-lg">{business?.name || 'Menú'}</span>
                        </div>
                        <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-gray-700">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </header>

                    {/* Enlaces de Navegación */}
                    <nav className="flex-grow p-4 space-y-2">
                        {menuItems.map((item) => (
                            <Link key={item.name} href={item.href} onClick={onClose} className="flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors duration-200">
                                <item.icon className="h-6 w-6 text-green-400" />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        ))}
                    </nav>

                    {/* Pie de Página del Menú (Logout) */}
                    <footer className="p-4 border-t border-gray-700">
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:text-white hover:bg-red-500/80 rounded-md transition-colors duration-200">
                            <ArrowLeftOnRectangleIcon className="h-6 w-6" />
                            <span className="font-medium">Cerrar Sesión</span>
                        </button>
                    </footer>
                </div>
            </div>
        </>
    );
}
