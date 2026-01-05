'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function Header() {
  const pathname = usePathname();
  const { business, loading } = useBusiness();

  const isHomePage = pathname === '/';
  const dashboardHomeUrl = '/';

  const renderHeaderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-6 w-40" />
        </div>
      );
    }

    // Si el negocio no se ha cargado o no existe, muestra un estado por defecto.
    if (!business) {
      return <div className="font-semibold text-white">LottoSalesHub</div>;
    }

    return (
      <div className="flex items-center gap-3">
        {business.logoUrl ? (
          <Image
            src={business.logoUrl}
            alt="Logo del negocio"
            width={40}
            height={40}
            className="rounded-full object-cover bg-gray-200"
          />
        ) : (
          // Placeholder si no hay logo
          <div className="h-10 w-10 rounded-full bg-purple-200 flex items-center justify-center">
            <span className="text-purple-600 font-bold text-lg">{business.name?.charAt(0) || 'L'}</span>
          </div>
        )}
        <h1 className="text-lg font-bold text-white">
          {business.name || 'Mi Negocio'}
        </h1>
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/20 bg-white/10 px-4 shadow-md backdrop-blur-xl">
      <div className="flex items-center gap-4">
        {!isHomePage && (
          <Link 
            href={dashboardHomeUrl} 
            className="p-2 rounded-full text-gray-200 hover:bg-gray-800/60 hover:text-white transition-colors"
            aria-label="Volver al inicio"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}
        {renderHeaderContent()}
      </div>
    </header>
  );
}
