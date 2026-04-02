'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, Transition } from '@headlessui/react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { 
    ArrowLeftOnRectangleIcon, 
    BuildingStorefrontIcon,
    ChevronDownIcon,
    Cog6ToothIcon,
    TicketIcon, 
    TrophyIcon, 
    ArchiveBoxIcon,
    ShieldCheckIcon,
    UserCircleIcon
} from '@heroicons/react/24/outline';

const navItems = [
    { href: '/draws', icon: TicketIcon, label: 'Gestionar Sorteos' },
    { href: '/resultados', icon: TrophyIcon, label: 'Registrar Resultados' },
    { href: '/cierres-sorteos', icon: ArchiveBoxIcon, label: 'Cierres de Sorteos' },
    { href: '/verificacion', icon: ShieldCheckIcon, label: 'Verificar Tickets' },
    { href: '/business', icon: BuildingStorefrontIcon, label: 'Configurar Negocio' },
];

const AppHeader = () => {
    const { user, logout } = useAuth();
    const { business } = useBusiness();

    return (
        <header className="bg-gray-900/80 backdrop-blur-lg text-white p-4 flex justify-between items-center border-b border-white/10 sticky top-0 z-40">
            {/* Business Info */}
            <div className="flex items-center gap-3">
                {business?.logoUrl ? (
                    <Image src={business.logoUrl} alt="Logo" width={40} height={40} className="rounded-full object-cover border-2 border-white/10" />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center border-2 border-green-500/30">
                        <BuildingStorefrontIcon className="w-5 h-5 text-green-400" />
                    </div>
                )}
                <h1 className="text-lg font-bold text-white hidden sm:block">{business?.name || 'Mi Negocio'}</h1>
            </div>

            {/* User Menu and Logout */}
            <div className="flex items-center gap-4">
                <Menu as="div" className="relative">
                    <Menu.Button className="flex items-center gap-2 py-2 px-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <UserCircleIcon className="h-6 w-6 text-gray-300"/>
                        <span className="hidden md:inline font-medium text-sm">{user?.email}</span>
                        <ChevronDownIcon className="h-4 w-4 text-gray-400"/>
                    </Menu.Button>
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                    >
                        <Menu.Items className="absolute right-0 mt-2 w-64 origin-top-right bg-gray-800 border border-white/10 rounded-md shadow-lg z-50 focus:outline-none">
                            <div className="px-1 py-1">
                                <div className="px-4 py-2 border-b border-white/10">
                                    <p className="text-sm font-medium text-white">Menú Principal</p>
                                    <p className="text-xs text-gray-400">Navega a otras secciones</p>
                                </div>
                                <div className="mt-2 space-y-1">
                                    {navItems.map((item) => (
                                        <Menu.Item key={item.href}>
                                            {({ active }) => (
                                                <Link href={item.href} className={`${active ? 'bg-green-600/20 text-green-300' : 'text-gray-200'} group flex w-full items-center rounded-md px-3 py-2 text-sm`}>
                                                    <item.icon className="mr-3 h-5 w-5" />
                                                    {item.label}
                                                </Link>
                                            )}
                                        </Menu.Item>
                                    ))}
                                </div>
                            </div>
                             <div className="px-1 py-1 border-t border-white/10">
                                <Menu.Item>
                                    {({ active }) => (
                                        <button onClick={logout} className={`${active ? 'bg-red-600/20 text-red-300' : 'text-gray-200'} group flex w-full items-center rounded-md px-3 py-2 text-sm`}>
                                            <ArrowLeftOnRectangleIcon className="mr-3 h-5 w-5" />
                                            Cerrar Sesión
                                        </button>
                                    )}
                                </Menu.Item>
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>
        </header>
    );
};

export default AppHeader;
