import { Inter } from 'next/font/google';
import './globals.css';
import { DrawsProvider } from '../contexts/DrawsContext';
import { BusinessProvider } from '../contexts/BusinessContext';
import { AuthProvider } from '../contexts/AuthContext';
import React from 'react';
import ThemeManager from '@/components/ThemeManager';
import type { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: 'LottoSalesHub - V3',
    description: 'Plataforma de gestión de ventas de lotería',
    manifest: process.env.NODE_ENV === "production" ? "/manifest.json" : undefined,
  };
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* La etiqueta <link rel="manifest"> fue eliminada. Next.js la gestiona con generateMetadata. */}
        <meta name="theme-color" content="#8B5CF6" />
      </head>
      <body className={inter.className}>
        <BusinessProvider>
          <AuthProvider>
            <ThemeManager>
              <DrawsProvider>
                {children}
              </DrawsProvider>
            </ThemeManager>
          </AuthProvider>
        </BusinessProvider>
      </body>
    </html>
  );
}
