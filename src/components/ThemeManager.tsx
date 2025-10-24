'use client';

import { useEffect } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { themes } from '@/lib/themes';

export default function ThemeManager({ children }: { children: React.ReactNode }) {
  const { theme, isLoading } = useBusiness();

  useEffect(() => {
    if (isLoading) return;

    const selectedTheme = themes.find(t => t.name === theme) || themes[0];
    const themeStyles = selectedTheme.styles;

    // Aplicar estilos globales
    document.body.style.backgroundImage = themeStyles.backgroundImage;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundPosition = 'center';

    const root = document.documentElement;
    root.style.setProperty('--color-primary', themeStyles.primary);
    root.style.setProperty('--color-accent', themeStyles.accent);

    // Función de limpieza para quitar los estilos cuando el componente se desmonte
    return () => {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundAttachment = '';
      document.body.style.backgroundPosition = '';
    };
  }, [theme, isLoading]);

  return <>{children}</>;
}
