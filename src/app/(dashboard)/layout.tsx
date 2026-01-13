'use client';

import React from 'react';
import Header from '@/components/Header';
import { Toaster } from "@/components/ui/toaster";
import { ClosedSchedulesProvider } from '@/contexts/ClosedSchedulesContext'; // Import the new provider

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClosedSchedulesProvider> {/* Wrap the content with the new provider */}
      <Header />
      <main className="p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <Toaster />
    </ClosedSchedulesProvider>
  );
}
