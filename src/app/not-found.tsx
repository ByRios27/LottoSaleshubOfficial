
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      textAlign: 'center'
    }}>
      <h2>Página No Encontrada</h2>
      <p>No se pudo encontrar el recurso solicitado.</p>
      <Link href="/" style={{ marginTop: '20px', color: 'lightblue' }}>
        Volver al Inicio
      </Link>
    </div>
  );
}
