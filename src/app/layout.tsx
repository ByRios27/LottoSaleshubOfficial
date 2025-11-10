import { Inter } from 'next/font/google';
import './globals.css';
import { DrawsProvider } from '../contexts/DrawsContext';
import { BusinessProvider } from '../contexts/BusinessContext';
import { AuthProvider } from '../contexts/AuthContext'; // Importar AuthProvider
import React from 'react';
import ThemeManager from '@/components/ThemeManager';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'LottoSalesHub - V3',
  description: 'Plataforma de gestión de ventas de lotería',
  manifest: '/manifest.json', // Añadido para PWA
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#8B5CF6" />
      </head>
      <body className={inter.className}>
        <AuthProvider> {/** Envolver con AuthProvider */}
          <BusinessProvider>
            <ThemeManager>
              <DrawsProvider>
                {children}
              </DrawsProvider>
            </ThemeManager>
          </BusinessProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
