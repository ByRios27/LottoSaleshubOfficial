'use client';

import { ChartBarIcon } from '@heroicons/react/24/solid';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBusiness } from '@/contexts/BusinessContext';
import { DrawsProvider } from '@/contexts/DrawsContext';
import { themes } from '@/lib/themes';
import Image from "next/image";

// Componente de Carga
function LoadingSpinner() {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-[100]">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-green-500"></div>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { businessName, businessLogo, theme, isLoading } = useBusiness();

  const selectedTheme = themes.find(t => t.name === theme) || themes[0];
  const themeStyles = selectedTheme.styles;

  const renderLogo = () => {
    if (businessLogo && businessLogo !== 'default') {
      return (
        <div className="w-12 h-12 relative rounded-full overflow-hidden flex-shrink-0">
          <Image
            src={businessLogo}
            alt={`${businessName} logo`}
            fill
            priority
            sizes="48px"
            style={{
              objectFit: 'cover',
              maxWidth: "100%",
              height: "auto"
            }} />
        </div>
      );
    } else {
      return (
        <div className="p-2 bg-primary rounded-full group-hover:scale-110 transition-transform">
            <ChartBarIcon className="w-8 h-8 text-white" />
        </div>
      );
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <DrawsProvider>
        <section>
          {themeStyles && (
              <header 
                className={`sticky top-0 z-50 flex items-center justify-center py-4 ${themeStyles.glassClasses}`}
              >
                <div className="absolute left-6">
                  <button 
                    onClick={() => router.back()}
                    className={`p-2 rounded-full hover:bg-white/20 transition-colors ${themeStyles.textSecondary}`}
                    aria-label="Volver a la página anterior"
                  >
                    <ArrowLeftIcon className="w-6 h-6 stroke-[2.5]" />
                  </button>
                </div>
                <Link href="/" className="flex items-center gap-4 group">
                    {renderLogo()}
                    <h1 className={`text-2xl font-bold ${themeStyles.textPrimary}`}>{businessName}</h1>
                </Link>
              </header>
          )}
          <main>
            {children}
          </main>
        </section>
    </DrawsProvider>
  );
}
