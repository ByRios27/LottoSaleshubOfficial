
'use client';

import React, { useState } from 'react';
import { Bars3Icon } from '@heroicons/react/24/solid';
import SideMenu from './SideMenu';
import { useAuth } from '@/contexts/AuthContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { BusinessProvider } from '@/contexts/BusinessContext';
import { DrawsProvider } from '@/contexts/DrawsContext';

const AppUI = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();
    const [isMenuOpen, setMenuOpen] = useState(false);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-green-500"></div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-gray-900">
            {user && (
                <>
                    <button 
                        onClick={() => setMenuOpen(true)} 
                        className="fixed top-4 left-4 z-[60] p-2 bg-gray-800/50 text-white rounded-md hover:bg-gray-700/70 transition-colors"
                        aria-label="Abrir menú"
                    >
                        <Bars3Icon className="h-6 w-6" />
                    </button>
                    <SideMenu isOpen={isMenuOpen} onClose={() => setMenuOpen(false)} />
                </>
            )}
            <main>{children}</main>
        </div>
    );
}

export default function AppWrapper({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <BusinessProvider>
                <DrawsProvider>
                    <AppUI>{children}</AppUI>
                </DrawsProvider>
            </BusinessProvider>
        </AuthProvider>
    );
}
