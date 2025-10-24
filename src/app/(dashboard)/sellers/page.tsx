import Link from 'next/link';

export default function Sellers() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-black">
        <h1 className="text-3xl font-bold">Vendedores</h1>
        <p className="mt-2 text-gray-600">Manage your sellers here.</p>
        <Link href="/" className="mt-8 text-green-500 hover:underline">
            Volver al Inicio
        </Link>
    </div>
  );
}
