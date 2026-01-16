import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../contexts/AuthContext';
import { MasterDataProvider } from '../contexts/MasterDataContext';
import { BusinessProvider } from '../contexts/BusinessContext';
import { DrawsProvider } from '../contexts/DrawsContext';
import { ResultsProvider } from '../contexts/ResultsContext';
import { SalesProvider } from '../contexts/SalesContext';
import { ClosedSchedulesProvider } from '../contexts/ClosedSchedulesContext';
import React from 'react';
import ThemeWrapper from '@/components/main/ThemeWrapper';
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
      <body>
        <AuthProvider>
          <MasterDataProvider>
            <BusinessProvider>
                <DrawsProvider>
                  <ResultsProvider>
                    <SalesProvider>
                      <ClosedSchedulesProvider>
                        <ThemeWrapper>
                            {children}
                        </ThemeWrapper>
                      </ClosedSchedulesProvider>
                    </SalesProvider>
                  </ResultsProvider>
                </DrawsProvider>
            </BusinessProvider>
          </MasterDataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
