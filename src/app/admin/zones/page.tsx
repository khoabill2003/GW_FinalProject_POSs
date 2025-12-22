'use client';

import { useState, useEffect, useCallback } from 'react';

interface Zone {
  id: string;
  name: string;
  description?: string;
  _count?: {
    tables: number;
  };
  createdAt: string;
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const fetchZones = useCallback(async () => {
    try {
      const response = await fetch('/api/zones');
      if (response.ok) {
        const data = await response.json();
        setZones(data.zones || []);
      } else {
        setError('Không thể tải danh sách khu vực');
      }
    } catch {
      setError('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const openCreateModal = () => {
    setEditingZone(null);
    setFormData({ name: '', description: '' });
    setShowModal(true);
  };

  const openEditModal = (zone: Zone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      description: zone.description || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const url = editingZone ? `/api/zones/${editingZone.id}` : '/api/zones';
      const method = editingZone ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchZones();
        setShowModal(false);
        setFormData({ name: '', description: '' });
      } else {
        const data = await response.json();
        setError(data.error || 'Có lỗi xảy ra');
      }
    } catch {
      setError('Lỗi kết nối');
    }
  };

  const handleDelete = async (zone: Zone) => {
    if (!confirm(`Bạn có chắc muốn xóa khu vực "${zone.name}"?`)) return;

    try {
      const response = await fetch(`/api/zones/${zone.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchZones();
      } else {
        const data = await response.json();
        setError(data.error || 'Không thể xóa khu vực');
      }
    } catch {
      setError('Lỗi kết nối');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏠 Quản lý Khu Vực</h1>
          <p className="text-gray-500 mt-1">Quản lý các khu vực trong nhà hàng (VD: Trong Nhà, Ngoài Trời, VIP...)</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
        >
          <span>➕</span>
          Thêm khu vực
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button
            onClick={() => setError('')}
            className="float-right text-red-700 hover:text-red-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {zones.map((zone) => (
          <div
            key={zone.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{zone.name}</h3>
                  {zone.description && (
                    <p className="text-gray-500 text-sm mt-1">{zone.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
                  🪑 {zone._count?.tables || 0} bàn
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t">
                <button
                  onClick={() => openEditModal(zone)}
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  ✏️ Sửa
                </button>
                <button
                  onClick={() => handleDelete(zone)}
                  className="flex-1 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                >
                  🗑️ Xóa
                </button>
              </div>
            </div>
          </div>
        ))}

        {zones.length === 0 && (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl">
            <span className="text-4xl mb-4 block">🏠</span>
            <p className="text-gray-500">Chưa có khu vực nào</p>
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              Thêm khu vực đầu tiên
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {editingZone ? '✏️ Sửa khu vực' : '➕ Thêm khu vực mới'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên khu vực *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Trong Nhà, Ngoài Trời, VIP..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả về khu vực này..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    {editingZone ? 'Cập nhật' : 'Thêm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
