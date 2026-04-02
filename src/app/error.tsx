'use client'; // Los componentes de error deben ser componentes de cliente

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Opcional: Registrar el error en un servicio de monitorización
    console.error(error);
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      textAlign: 'center'
    }}>
      <h2>¡Ups! Algo salió mal</h2>
      <p>Ha ocurrido un error inesperado en el servidor.</p>
      <button
        onClick={() => reset()}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          cursor: 'pointer',
          background: '#8B5CF6',
          color: 'white',
          border: 'none',
          borderRadius: '5px'
        }}
      >
        Intentar de Nuevo
      </button>
    </div>
  );
}
