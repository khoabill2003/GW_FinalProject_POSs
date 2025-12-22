'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="bg-primary-600 text-white h-16 flex items-center justify-between px-6 shadow-md">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">🍽️ Restaurant POS</h1>
      </div>
      
      <nav className="flex items-center gap-4">
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 transition-colors"
        >
          POS Terminal
        </Link>
        <Link
          href="/admin"
          className="px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 transition-colors"
        >
          Admin Panel
        </Link>
      </nav>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-800 flex items-center justify-center">
            👤
          </div>
          <div className="text-sm">
            <p className="font-medium">{user?.name || 'User'}</p>
            <p className="text-primary-200 text-xs capitalize">{user?.role || 'Cashier'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-sm bg-primary-800 hover:bg-primary-900 rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
