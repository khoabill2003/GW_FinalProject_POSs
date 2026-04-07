'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/utils';

interface ReservationItem {
  id: string;
  quantity: number;
  notes?: string;
  menuItem: { id: string; name: string; price: number; image?: string };
}

interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  guests: number;
  reservationTime: string;
  notes?: string;
  status: string;
  createdAt: string;
  table: { id: string; number: number; capacity: number; zone?: { name: string } };
  items: ReservationItem[];
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800' },
  seated: { label: 'Đã ngồi', color: 'bg-green-100 text-green-800' },
  completed: { label: 'Hoàn thành', color: 'bg-gray-100 text-gray-800' },
  cancelled: { label: 'Đã hủy', color: 'bg-red-100 text-red-800' },
};

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const res = await fetch(`/api/reservations?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReservations(data.reservations || []);
      }
    } catch (err) {
      console.error('Failed to fetch reservations:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    setLoading(true);
    fetchReservations();
  }, [fetchReservations]);

  // Auto-refresh every 15s
  useEffect(() => {
    const interval = setInterval(fetchReservations, 15000);
    return () => clearInterval(interval);
  }, [fetchReservations]);

  const handleAction = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await fetchReservations();
        setSelectedReservation(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Lỗi cập nhật');
      }
    } catch {
      alert('Lỗi kết nối');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa đặt bàn này?')) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchReservations();
        setSelectedReservation(null);
      }
    } catch {
      alert('Lỗi kết nối');
    } finally {
      setActionLoading(null);
    }
  };

  const getItemsTotal = (items: ReservationItem[]) =>
    items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📅 Quản lý Đặt bàn</h1>
          <p className="text-gray-500 text-sm">Xác nhận và quản lý các đơn đặt bàn từ khách hàng</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchReservations(); }}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
        >
          🔄 Làm mới
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'pending', label: '⏳ Chờ xác nhận' },
          { key: 'confirmed', label: '✅ Đã xác nhận' },
          { key: 'seated', label: '🪑 Đã ngồi' },
          { key: 'completed', label: '✔️ Hoàn thành' },
          { key: 'cancelled', label: '❌ Đã hủy' },
          { key: 'all', label: '📋 Tất cả' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filterStatus === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            {tab.key === filterStatus && ` (${reservations.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Đang tải...</div>
      ) : reservations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm">
          <span className="text-5xl block mb-3">📅</span>
          <p className="text-gray-500 text-lg">Không có đặt bàn nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {reservations.map((r) => (
            <div
              key={r.id}
              className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden transition-all hover:shadow-md cursor-pointer ${
                selectedReservation?.id === r.id ? 'border-blue-500' : 'border-transparent'
              }`}
              onClick={() => setSelectedReservation(selectedReservation?.id === r.id ? null : r)}
            >
              {/* Card header */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{r.customerName}</h3>
                    <p className="text-sm text-gray-500">{r.customerPhone}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_MAP[r.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_MAP[r.status]?.label || r.status}
                  </span>
                </div>
              </div>

              {/* Card body */}
              <div className="px-5 py-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">🪑 Bàn</span>
                  <span className="font-medium">
                    Bàn {r.table.number} ({r.table.capacity} chỗ)
                    {r.table.zone && <span className="text-gray-400"> · {r.table.zone.name}</span>}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">👥 Số khách</span>
                  <span className="font-medium">{r.guests} người</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">📅 Thời gian</span>
                  <span className="font-medium">
                    {new Date(r.reservationTime).toLocaleDateString('vi-VN')} lúc{' '}
                    {new Date(r.reservationTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {r.items.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">🍽️ Món đặt trước</span>
                    <span className="font-medium">{r.items.length} món · {formatCurrency(getItemsTotal(r.items))}</span>
                  </div>
                )}
                {r.notes && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">📝 Ghi chú</span>
                    <span className="font-medium text-right max-w-[60%] truncate">{r.notes}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-gray-400 pt-1">
                  <span>Đặt lúc</span>
                  <span>{new Date(r.createdAt).toLocaleString('vi-VN')}</span>
                </div>
              </div>

              {/* Expanded detail: pre-ordered items */}
              {selectedReservation?.id === r.id && r.items.length > 0 && (
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                  <h4 className="font-semibold text-sm mb-2 text-gray-700">Món đặt trước:</h4>
                  <div className="space-y-1">
                    {r.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.menuItem.name}</span>
                        <span className="text-gray-600">{formatCurrency(item.menuItem.price * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-200">
                      <span>Tổng tạm tính</span>
                      <span>{formatCurrency(getItemsTotal(r.items))}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {selectedReservation?.id === r.id && (
                <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex gap-2 flex-wrap">
                  {r.status === 'pending' && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAction(r.id, 'confirmed'); }}
                        disabled={actionLoading === r.id}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50"
                      >
                        ✅ Xác nhận
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAction(r.id, 'cancelled'); }}
                        disabled={actionLoading === r.id}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm disabled:opacity-50"
                      >
                        ❌ Từ chối
                      </button>
                    </>
                  )}
                  {r.status === 'confirmed' && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAction(r.id, 'seated'); }}
                        disabled={actionLoading === r.id}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm disabled:opacity-50"
                      >
                        🪑 Khách đã đến - Tạo đơn
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAction(r.id, 'cancelled'); }}
                        disabled={actionLoading === r.id}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm disabled:opacity-50"
                      >
                        ❌ Hủy
                      </button>
                    </>
                  )}
                  {r.status === 'seated' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAction(r.id, 'completed'); }}
                      disabled={actionLoading === r.id}
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium text-sm disabled:opacity-50"
                    >
                      ✔️ Hoàn thành
                    </button>
                  )}
                  {(r.status === 'cancelled' || r.status === 'completed') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                      disabled={actionLoading === r.id}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm disabled:opacity-50"
                    >
                      🗑️ Xóa
                    </button>
                  )}
                  {actionLoading === r.id && (
                    <span className="text-sm text-gray-500 self-center">Đang xử lý...</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
