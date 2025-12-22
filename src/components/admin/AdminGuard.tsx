'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user && !['owner', 'manager'].includes(user.role)) {
        // Chỉ owner và manager mới được vào admin
        router.push('/');
        alert('⛔ Bạn không có quyền truy cập trang quản trị!');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !['owner', 'manager'].includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-6xl mb-4">⛔</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Không có quyền truy cập</h1>
          <p className="text-gray-600 mb-4">Chỉ Owner và Manager mới có thể truy cập trang quản trị.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Về trang chính
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
