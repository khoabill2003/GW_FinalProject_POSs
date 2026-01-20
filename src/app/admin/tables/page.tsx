'use client';

import { useState, useEffect, useCallback } from 'react';

interface Zone {
  id: string;
  name: string;
}

interface Table {
  id: string;
  number: number;
  name: string | null;
  capacity: number;
  status: string;
  zoneId: string | null;
  zone: Zone | null;
  orders: { id: string }[];
  createdAt: string;
}

type ModalMode = 'create' | 'edit' | null;

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [filterZone, setFilterZone] = useState<string>('all');

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [deleteConfirmTable, setDeleteConfirmTable] = useState<Table | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedTableForQR, setSelectedTableForQR] = useState<Table | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    number: '',
    name: '',
    capacity: '4',
    status: 'available',
    zoneId: '',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tablesRes, zonesRes] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/zones'),
      ]);

      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        setTables(tablesData.tables || []);
      }
      if (zonesRes.ok) {
        const zonesData = await zonesRes.json();
        setZones(zonesData.zones || []);
      }
      setError('');
    } catch {
      setError('Lỗi mạng. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const filteredTables = filterZone === 'all'
    ? tables
    : filterZone === 'booked'
    ? tables.filter(t => t.status === 'occupied')
    : tables;

  const openCreateModal = () => {
    const nextNumber = tables.length > 0 
      ? Math.max(...tables.map(t => t.number)) + 1 
      : 1;
    setFormData({
      number: nextNumber.toString(),
      name: '',
      capacity: '4',
      status: 'available',
      zoneId: '',
    });
    setFormError('');
    setModalMode('create');
  };

  const openEditModal = (table: Table) => {
    setSelectedTable(table);
    setFormData({
      number: table.number.toString(),
      name: table.name || '',
      capacity: table.capacity.toString(),
      status: table.status,
      zoneId: table.zoneId || '',
    });
    setFormError('');
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedTable(null);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    const submitData = {
      ...formData,
      zoneId: formData.zoneId || null,
    };

    try {
      if (modalMode === 'create') {
        const response = await fetch('/api/tables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        });

        const data = await response.json();

        if (response.ok) {
          setSuccessMessage('Tạo bàn thành công!');
          fetchData();
          closeModal();
        } else {
          setFormError(data.error || 'Không thể tạo bàn');
        }
      } else if (modalMode === 'edit' && selectedTable) {
        const response = await fetch(`/api/tables/${selectedTable.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        });

        const data = await response.json();

        if (response.ok) {
          setSuccessMessage('Cập nhật bàn thành công!');
          fetchData();
          closeModal();
        } else {
          setFormError(data.error || 'Không thể cập nhật bàn');
        }
      }
    } catch {
      setFormError('Lỗi mạng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmTable) return;

    try {
      const response = await fetch(`/api/tables/${deleteConfirmTable.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Xóa bàn thành công!');
        fetchData();
      } else {
        setError(data.error || 'Không thể xóa bàn');
      }
    } catch {
      setError('Lỗi mạng. Vui lòng thử lại.');
    } finally {
      setDeleteConfirmTable(null);
    }
  };

  const updateTableStatus = async (table: Table, newStatus: string) => {
    try {
      const response = await fetch(`/api/tables/${table.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch {
      console.error('Failed to update table status');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🪑 Quản lý Bàn</h1>
          <p className="text-gray-500 mt-1">Quản lý bàn theo khu vực</p>
        </div>
        <div className="flex gap-3">
          <a
            href="/admin/zones"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            🏠 Quản lý Khu Vực
          </a>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
          >
            <span>➕</span>
            Thêm bàn
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError('')} className="float-right">✕</button>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Filter by Zone */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilterZone('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterZone === 'all'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({tables.length})
        </button>
        <button
          onClick={() => setFilterZone('booked')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterZone === 'booked'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Booked ({tables.filter(t => t.status === 'occupied').length})
        </button>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredTables.map((table) => {
          // Generate avatar color and initials from zone or name
          const initials = table.zone 
            ? table.zone.name.substring(0, 2).toUpperCase()
            : table.name 
            ? table.name.substring(0, 2).toUpperCase()
            : 'T' + table.number;
          
          const colors = [
            'bg-blue-500',
            'bg-yellow-500',
            'bg-green-500',
            'bg-red-500',
            'bg-purple-500',
            'bg-pink-500',
            'bg-indigo-500',
            'bg-cyan-500',
          ];
          const colorIndex = table.number % colors.length;
          const bgColor = colors[colorIndex];
          
          return (
            <div
              key={table.id}
              className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 p-4 hover:shadow-xl transition-all hover:scale-105 cursor-pointer"
              onClick={() => openEditModal(table)}
            >
              {/* Header with Title and Status Badge */}
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-white text-lg">Table {table.number}</h3>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  table.status === 'available'
                    ? 'bg-green-500 text-white'
                    : 'bg-yellow-500 text-white'
                }`}>
                  {table.status === 'available' ? 'Available' : 'Booked'}
                </span>
              </div>

              {/* Avatar */}
              <div className={`${bgColor} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-white font-bold text-xl shadow-md`}>
                {initials}
              </div>

              {/* Zone Info */}
              {table.zone && (
                <div className="text-center mb-2">
                  <p className="text-xs text-gray-400">🏠 {table.zone.name}</p>
                </div>
              )}

              {/* Seats */}
              <div className="text-center">
                <p className="text-xs text-gray-400">Seats: {table.capacity}</p>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(table);
                  }}
                  className="flex-1 text-xs bg-gray-700 text-white py-1.5 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  ✏️ Edit
                </button>
                {table.status === 'occupied' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTableStatus(table, 'available');
                    }}
                    className="flex-1 text-xs bg-green-500 text-white py-1.5 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    ✓ Free
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredTables.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <span className="text-4xl mb-4 block">🪑</span>
          <p className="text-gray-500">Không có bàn nào</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {modalMode === 'create' ? '➕ Thêm bàn mới' : '✏️ Sửa bàn'}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số bàn *
                    </label>
                    <input
                      type="number"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sức chứa
                    </label>
                    <input
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      min="1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên bàn (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Bàn VIP, Bàn góc..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🏠 Khu vực
                  </label>
                  <select
                    value={formData.zoneId}
                    onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">-- Chưa phân khu --</option>
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name}
                      </option>
                    ))}
                  </select>
                  {zones.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      <a href="/admin/zones" className="text-primary-600 hover:underline">
                        Thêm khu vực mới →
                      </a>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="available">🟢 Trống</option>
                    <option value="occupied">🔴 Đang dùng</option>
                    <option value="reserved">🟡 Đã đặt</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  {modalMode === 'edit' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTableForQR(selectedTable);
                        setShowQRModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      📱 QR Code
                    </button>
                  )}
                  {modalMode === 'edit' && (
                    <button
                      type="button"
                      onClick={() => {
                        closeModal();
                        setDeleteConfirmTable(selectedTable);
                      }}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      🗑️ Xóa
                    </button>
                  )}
                  <div className="flex-1"></div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang lưu...' : modalMode === 'create' ? 'Tạo bàn' : 'Cập nhật'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold mb-4">Xác nhận xóa</h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc muốn xóa <strong>Bàn {deleteConfirmTable.number}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmTable(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedTableForQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">📱 Mã QR - Bàn {selectedTableForQR.number}</h2>
              <button
                onClick={() => {
                  setShowQRModal(false);
                  setSelectedTableForQR(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* QR Code Image */}
            <div className="bg-gray-100 rounded-lg p-6 flex items-center justify-center">
              <div className="w-64 h-64 flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                    `${typeof window !== 'undefined' ? window.location.origin : ''}/table/${selectedTableForQR.number}`
                  )}`}
                  alt="QR Code"
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-medium">📍 URL: <code className="bg-white px-2 py-1 rounded text-xs">/table/{selectedTableForQR.number}</code></p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Copy QR code URL to clipboard
                  const qrUrl = `/table/${selectedTableForQR.number}`;
                  const fullUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${qrUrl}`;
                  navigator.clipboard.writeText(fullUrl);
                  alert('✅ Đã sao chép URL!');
                }}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                📋 Sao chép URL
              </button>
              <button
                onClick={() => {
                  // Print QR code
                  const printWindow = window.open('', '', 'height=600,width=400');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>QR Code - Bàn ${selectedTableForQR.number}</title>
                          <style>
                            body { margin: 0; padding: 20px; font-family: Arial; text-align: center; }
                            h1 { margin: 0 0 20px 0; }
                            img { max-width: 300px; }
                          </style>
                        </head>
                        <body>
                          <h1>Bàn ${selectedTableForQR.number}</h1>
                          <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                            `${typeof window !== 'undefined' ? window.location.origin : ''}/table/${selectedTableForQR.number}`
                          )}" />
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    setTimeout(() => {
                      printWindow.print();
                    }, 250);
                  }
                }}
                className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                🖨️ In
              </button>
              <button
                onClick={() => {
                  setShowQRModal(false);
                  setSelectedTableForQR(null);
                }}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
