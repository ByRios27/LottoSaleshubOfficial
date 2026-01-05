import { Inter } from 'next/font/google';
import './globals.css';
import { DrawsProvider } from '../contexts/DrawsContext';
import { BusinessProvider } from '../contexts/BusinessContext';
import { AuthProvider } from '../contexts/AuthContext';
import React from 'react';
import ThemeWrapper from '@/components/main/ThemeWrapper'; // Importamos el nuevo componente
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
        <meta name="theme-color" content="#8B5CF6" />
      </head>
      {/* El body principal ya no necesita clases, ThemeWrapper lo gestiona */}
      <body>
        <AuthProvider>
          <BusinessProvider>
            <ThemeWrapper>
              <DrawsProvider>
                {children}
              </DrawsProvider>
            </ThemeWrapper>
          </BusinessProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
