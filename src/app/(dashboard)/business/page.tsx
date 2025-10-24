'use client';

import { useState, useEffect, useRef } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import Image from 'next/image';
import {
  PhotoIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { ChartBarIcon } from '@heroicons/react/24/solid';
import { themes } from '@/lib/themes';

export default function BusinessPage() {
  const {
    businessName,
    businessLogo,
    theme,
    setBusinessName,
    setBusinessLogo,
    setTheme,
    resetBusinessInfo,
    isLoading,
  } = useBusiness();

  const [tempName, setTempName] = useState(businessName);
  const [tempLogo, setTempLogo] = useState(businessLogo);
  const [tempTheme, setTempTheme] = useState(theme);

  const [nameLogoSaveStatus, setNameLogoSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [themeSaveStatus, setThemeSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedTheme = themes.find((t) => t.name === theme) || themes[0];
  const themeStyles = selectedTheme.styles;

  useEffect(() => {
    if (!isLoading) {
      setTempName(businessName);
      setTempLogo(businessLogo);
      setTempTheme(theme);
    }
  }, [businessName, businessLogo, theme, isLoading]);

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNameLogoSave = () => {
    try {
      setBusinessName(tempName);
      setBusinessLogo(tempLogo);
      setNameLogoSaveStatus('success');
    } catch (e) {
      console.error("Error saving name and logo:", e);
      setNameLogoSaveStatus('error');
    }
    setTimeout(() => setNameLogoSaveStatus('idle'), 3000);
  };

  const handleThemeSave = () => {
    try {
      setTheme(tempTheme);
      setThemeSaveStatus('success');
    } catch (e) {
      console.error("Error saving theme:", e);
      setThemeSaveStatus('error');
    }
    setTimeout(() => setThemeSaveStatus('idle'), 3000);
  };

  const confirmAndReset = () => {
    resetBusinessInfo();
    setShowResetConfirm(false);
    window.location.reload();
  };

  const renderLogoPreview = () => {
    if (tempLogo && tempLogo !== 'default') {
      return <Image src={tempLogo} alt="Previsualización del logo" layout="fill" objectFit="cover" />;
    } else {
      return (
        <div className="w-full h-full flex items-center justify-center bg-primary">
          <ChartBarIcon className="w-20 h-20 text-white" />
        </div>
      );
    }
  };

  const renderSaveMessage = (status: 'idle' | 'success' | 'error') => {
    if (status === 'success') {
      return (
        <p className="text-sm text-green-300 text-right flex items-center justify-end gap-2">
          <CheckCircleIcon className="w-5 h-5" />
          ¡Cambios guardados con éxito!
        </p>
      );
    }
    if (status === 'error') {
      return (
        <p className="text-sm text-red-400 text-right flex items-center justify-end gap-2">
          <XCircleIcon className="w-5 h-5" />
          Error al guardar los cambios.
        </p>
      );
    }
    return <div className="h-5"></div>; // Placeholder para mantener el espacio
  };

  if (isLoading) {
    return null; // No renderizar nada si los datos están cargando
  }

  return (
    <div className="p-4 md:p-8 space-y-8 min-h-screen">
      {/* ---- Contenedor principal de configuración ---- */}
      <div className={`max-w-2xl mx-auto rounded-2xl p-6 ${themeStyles.glassClasses}`}>
        <h2 className={`text-xl font-semibold mb-6 ${themeStyles.textPrimary}`}>Personalizar Negocio</h2>
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className={`relative w-40 h-40 rounded-full flex items-center justify-center overflow-hidden border-2 border-white/50`}>
              {renderLogoPreview()}
            </div>
            <input
              type="file"
              accept="image/png, image/jpeg, image/svg+xml, image/webp"
              ref={fileInputRef}
              onChange={handleLogoChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-2 px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors ${themeStyles.textPrimary}`}>
              <PhotoIcon className="w-5 h-5" />
              Subir Logo
            </button>
          </div>
          <div>
            <label htmlFor="businessName" className={`block text-sm font-medium mb-1 ${themeStyles.textSecondary}`}>
              Nombre del Negocio
            </label>
            <input
              type="text"
              id="businessName"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className={`w-full px-3 py-2 bg-black/20 border border-white/30 rounded-lg shadow-sm focus:outline-none focus:ring-2 placeholder:text-gray-400 ${themeStyles.textPrimary}`}
              style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleNameLogoSave}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all"
              style={{ backgroundColor: 'var(--color-primary)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
            >
              <CheckCircleIcon className="w-5 h-5" />
              Guardar Cambios
            </button>
          </div>
          <div className="h-5 mt-2">
            {renderSaveMessage(nameLogoSaveStatus)}
          </div>
        </div>
      </div>

      {/* ---- Contenedor de Tema ---- */}
      <div className={`max-w-2xl mx-auto rounded-2xl p-6 ${themeStyles.glassClasses}`}>
        <h2 className={`text-xl font-semibold mb-6 ${themeStyles.textPrimary}`}>Temas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-8">
          {themes.map((t) => (
            <div key={t.name} className="flex flex-col items-center gap-3">
              <div
                className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/30 shadow-inner flex items-center justify-center bg-cover bg-center"
                style={{ backgroundImage: t.styles.backgroundImage }}
              ></div>
              <p className={`text-sm font-medium -mb-1 ${themeStyles.textSecondary}`}>{t.name}</p>
              <button
                onClick={() => setTempTheme(t.name)}
                className={`px-4 py-1 text-xs font-bold rounded-full transition-all duration-200 ${tempTheme === t.name
                    ? 'text-white shadow-md'
                    : 'bg-black/20 text-gray-200 border border-white/30 hover:bg-white/10'
                  }`}
                  style={{ backgroundColor: tempTheme === t.name ? 'var(--color-primary)' : undefined }}
              >
                {tempTheme === t.name ? 'Seleccionado' : 'Seleccionar'}
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-8">
          <button
            onClick={handleThemeSave}
            className="flex items-center justify-center gap-2 px-6 py-2.5 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all"
            style={{ backgroundColor: 'var(--color-primary)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
          >
            <CheckCircleIcon className="w-5 h-5" />
            Guardar y Aplicar
          </button>
        </div>
        <div className="h-5 mt-2">
          {renderSaveMessage(themeSaveStatus)}
        </div>
      </div>

      {/* ---- Contenedor de Restablecer ---- */}
      <div className="max-w-2xl mx-auto bg-red-900/30 backdrop-blur-xl border border-red-400/50 p-6 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 text-red-300">
            <ExclamationTriangleIcon className="w-8 h-8" />
          </div>
          <div className="flex-grow">
            <h3 className="text-lg font-semibold text-red-200">Zona de Peligro</h3>
            <p className="text-sm text-red-300 mt-1">
              Restablecer la configuración eliminará tu logo, nombre y tema personalizados.
            </p>
          </div>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            <ArrowPathIcon className="w-5 h-5" />
            Restablecer
          </button>
        </div>
      </div>

      {/* ---- Modal de Confirmación de Reseteo ---- */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md z-50 flex justify-center items-center p-4">
          <div className={`rounded-2xl shadow-xl max-w-sm w-full p-6 text-center ${themeStyles.glassClasses}`}>
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-900/50">
              <ShieldExclamationIcon className="h-7 w-7 text-red-300" aria-hidden="true" />
            </div>
            <h3 className={`mt-4 text-lg font-semibold ${themeStyles.textPrimary}`}>¿Restablecer Ajustes?</h3>
            <p className={`mt-2 text-sm ${themeStyles.textSecondary}`}>
              Esta acción es permanente y devolverá el logo, el nombre y el tema a sus valores por defecto. ¿Estás
              seguro de que quieres continuar?
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className={`px-6 py-2 text-sm font-medium bg-black/20 border border-white/30 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 ${themeStyles.textSecondary}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmAndReset}
                className="px-6 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
