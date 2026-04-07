'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';

interface PeriodStats {
  sales: number;
  cost: number;
  profit: number;
  count: number;
}

interface OrderStats {
  today: PeriodStats;
  month: PeriodStats;
  year: PeriodStats;
}

export default function ReportsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await fetch('/api/reports/stats');

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      const data = await response.json();

      if (response.ok) {
        setStats(data.stats);
      } else {
        setError(data.error || 'Không thể tải thống kê');
      }
    } catch {
      setError('Lỗi mạng. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const profitMargin = (period: PeriodStats) => {
    if (period.sales === 0) return 0;
    return ((period.profit / period.sales) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Báo cáo doanh thu</h1>
        <button
          onClick={fetchStats}
          className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          🔄 Làm mới
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          ❌ {error}
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <p className="text-gray-500">Đang tải thống kê...</p>
        </div>
      ) : stats ? (
        <>
          {/* Today */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📅 Hôm nay</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Doanh thu</p>
                <p className="text-xl font-bold text-blue-900">{formatCurrency(stats.today.sales)}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600 font-medium">Chi phí</p>
                <p className="text-xl font-bold text-red-900">{formatCurrency(stats.today.cost)}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Lợi nhuận</p>
                <p className="text-xl font-bold text-green-900">{formatCurrency(stats.today.profit)}</p>
                <p className="text-xs text-green-600 mt-1">{profitMargin(stats.today)}% biên lợi nhuận</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Số đơn</p>
                <p className="text-xl font-bold text-purple-900">{stats.today.count}</p>
              </div>
            </div>
          </div>

          {/* Month */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📆 Tháng này</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Doanh thu</p>
                <p className="text-xl font-bold text-blue-900">{formatCurrency(stats.month.sales)}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600 font-medium">Chi phí</p>
                <p className="text-xl font-bold text-red-900">{formatCurrency(stats.month.cost)}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Lợi nhuận</p>
                <p className="text-xl font-bold text-green-900">{formatCurrency(stats.month.profit)}</p>
                <p className="text-xs text-green-600 mt-1">{profitMargin(stats.month)}% biên lợi nhuận</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Số đơn</p>
                <p className="text-xl font-bold text-purple-900">{stats.month.count}</p>
              </div>
            </div>
          </div>

          {/* Year */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Năm nay</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Doanh thu</p>
                <p className="text-xl font-bold text-blue-900">{formatCurrency(stats.year.sales)}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600 font-medium">Chi phí</p>
                <p className="text-xl font-bold text-red-900">{formatCurrency(stats.year.cost)}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Lợi nhuận</p>
                <p className="text-xl font-bold text-green-900">{formatCurrency(stats.year.profit)}</p>
                <p className="text-xs text-green-600 mt-1">{profitMargin(stats.year)}% biên lợi nhuận</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Số đơn</p>
                <p className="text-xl font-bold text-purple-900">{stats.year.count}</p>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
