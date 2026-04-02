'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HomeIcon, BriefcaseIcon, BanknotesIcon, PresentationChartLineIcon, ChartBarIcon, ArrowTrendingUpIcon, CogIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';
import { signOut as firebaseSignOut } from 'firebase/auth'; // Renamed import
import { auth } from '@/lib/firebase/client'; // Import auth instance
import { useAuth } from '@/contexts/AuthContext';

const navigation = [
  { name: 'Inicio', href: '/', icon: HomeIcon },
  { name: 'Mi Negocio', href: '/business', icon: BriefcaseIcon },
  { name: 'Ventas', href: '/sales', icon: BanknotesIcon },
  { name: 'Resultados', href: '/resultados', icon: PresentationChartLineIcon },
  { name: 'Estadísticas', href: '/ventas-del-dia', icon: ChartBarIcon },
  { name: 'Cierres Anteriores', href: '/cierres-anteriores', icon: ArrowTrendingUpIcon },
  { name: 'Vendedores', href: '/sellers', icon: ArrowTrendingUpIcon },
  { name: 'Configuración', href: '/settings', icon: CogIcon },
];

export function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth); // Correctly call signOut
      router.push('/login'); // Redirect to login page after sign out
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="flex h-full flex-col px-3 py-4 md:px-2 bg-gray-800 text-white">
      <Link href="/" className="mb-2 flex h-20 items-end justify-start rounded-md bg-blue-600 p-4 md:h-40">
        <div className="w-32 text-white md:w-40">
          {/* You can place a logo here */}
          <h1 className="text-2xl font-bold">LottoSales</h1>
        </div>
      </Link>
      <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2">
        <nav className="flex-grow">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-md p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3
                ${pathname === item.href ? 'bg-sky-100 text-blue-600' : ''}`}>
              <item.icon className="w-6" />
              <p className="hidden md:block">{item.name}</p>
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
            {user && (
                <div className="p-2 text-center text-xs text-gray-400">
                    <p>Bienvenido,</p>
                    <p className='font-bold'>{user.displayName || user.email}</p>
                </div>
            )}
        </div>

        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-3 rounded-md bg-red-600 p-3 text-sm font-medium hover:bg-red-500 md:flex-none md:justify-start md:p-2 md:px-3">
          <ArrowLeftOnRectangleIcon className="w-6" />
          <div className="hidden md:block">Cerrar Sesión</div>
        </button>
      </div>
    </div>
  );
}
