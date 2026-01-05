'use client';

import { useBusiness } from '@/contexts/BusinessContext';
import { themes } from '@/lib/themes';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme, loading } = useBusiness();

  // Encuentra el tema actual o usa el primero por defecto
  const selectedTheme = themes.find((t) => t.name === theme) || themes[0];
  const themeStyles = selectedTheme.styles;

  // Define el estilo del fondo dinámicamente
  const backgroundStyle = {
    backgroundImage: themeStyles.backgroundImage,
  };

  if (loading) {
    return (
        <body className={`${inter.className} bg-gray-900`}>
            <div className="flex justify-center items-center h-screen">
                <p className="text-white">Cargando Negocio...</p>
            </div>
        </body>
    )
  }

  return (
    <body 
        className={`${inter.className} bg-cover bg-center bg-no-repeat min-h-screen`}
        style={backgroundStyle}
    >
      {children}
    </body>
  );
}
