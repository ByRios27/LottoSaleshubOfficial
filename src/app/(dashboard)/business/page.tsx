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
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { ChartBarIcon } from '@heroicons/react/24/solid';
import { themes } from '@/lib/themes';
import { useAuth } from '@/contexts/AuthContext';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '@/lib/firebase';

export default function BusinessPage() {
  const { user } = useAuth();
  const storage = getStorage(app);
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

  const [nameSaveStatus, setNameSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [themeSaveStatus, setThemeSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [logoUploadStatus, setLogoUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

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

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) {
      return;
    }

    setLogoUploadStatus('uploading');
    try {
      // Corregido: Usar la ruta 'logos/' que coincide con las reglas de Storage
      const storageRef = ref(storage, `logos/${user.uid}/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Lógica mejorada: Guardar inmediatamente en el contexto global y local
      setBusinessLogo(downloadURL); // Guarda en el contexto global
      setTempLogo(downloadURL); // Actualiza la previsualización local
      
      setLogoUploadStatus('success');
    } catch (error) {
      console.error("Error uploading logo:", error);
      setLogoUploadStatus('error');
    } finally {
      setTimeout(() => setLogoUploadStatus('idle'), 3000);
    }
  };

  const handleNameSave = () => {
    try {
      setBusinessName(tempName);
      setNameSaveStatus('success');
    } catch (e) {
      console.error("Error saving name:", e);
      setNameSaveStatus('error');
    }
    setTimeout(() => setNameSaveStatus('idle'), 3000);
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
    if (logoUploadStatus === 'uploading') {
        return (
            <div className="w-full h-full flex items-center justify-center bg-primary/50">
                <ArrowUpTrayIcon className="w-16 h-16 text-white animate-pulse" />
            </div>
        );
    }

    if (tempLogo && tempLogo !== 'default') {
      // Corregido: Usar props modernas de `next/image`
      return <Image src={tempLogo} alt="Previsualización del logo" fill style={{ objectFit: 'cover' }} />;
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
    return null;
  }

  return (
    <div className="p-4 md:p-8 space-y-8 min-h-screen">
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
              disabled={logoUploadStatus === 'uploading'}
              className={`flex items-center gap-2 px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors ${themeStyles.textPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}>
              <PhotoIcon className="w-5 h-5" />
              {logoUploadStatus === 'uploading' ? 'Subiendo...' : 'Subir Logo'}
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
              onClick={handleNameSave}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all"
              style={{ backgroundColor: 'var(--color-primary)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
            >
              <CheckCircleIcon className="w-5 h-5" />
              Guardar Nombre
            </button>
          </div>
          <div className="h-5 mt-2">
            {renderSaveMessage(nameSaveStatus)}
          </div>
        </div>
      </div>

      {/* ... (El resto del código de temas y reseteo permanece igual) ... */}

    </div>
  );
}
