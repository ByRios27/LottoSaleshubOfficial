'use client';

import React from 'react';
import Header from '@/components/Header';
import { Toaster } from "@/components/ui/toaster";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <Toaster />
    </>
  );
}
