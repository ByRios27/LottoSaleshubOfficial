import { Inter } from 'next/font/google';
import './globals.css';
import { DrawsProvider } from '../contexts/DrawsContext';
import { BusinessProvider } from '../contexts/BusinessContext';
import React from 'react';
import ThemeManager from '@/components/ThemeManager';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'LottoSalesHub - V3',
  description: 'Plataforma de gestión de ventas de lotería',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <BusinessProvider> {/* 1. Envolver con BusinessProvider */}
          <ThemeManager>
            <DrawsProvider> {/* 2. DrawsProvider queda dentro */}
              {children}
            </DrawsProvider>
          </ThemeManager>
        </BusinessProvider>
      </body>
    </html>
  );
}
