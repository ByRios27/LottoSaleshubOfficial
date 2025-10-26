import '@/app/globals.css';
import type { AppProps } from 'next/app';

// Este componente envuelve todas las páginas en el directorio `pages`.
// Al importar `globals.css` aquí, nos aseguramos de que los estilos de Tailwind
// se apliquen a la página de login y a cualquier otra página que se cree en este directorio.
function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;
