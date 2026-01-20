'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/utils';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  costPrice: number;
  stock: number;
  minStock: number;
  description: string | null;
  _count: {
    menuItems: number;
  };
  createdAt: string;
}

type ModalMode = 'create' | 'edit' | null;

const UNITS = ['kg', 'g', 'lít', 'ml', 'cái', 'gói', 'hộp', 'chai', 'lon', 'quả', 'bó', 'miếng'];

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Ingredient | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    unit: 'kg',
    costPrice: '',
    stock: '0',
    minStock: '0',
    description: '',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchIngredients = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/ingredients');
      if (response.ok) {
        const data = await response.json();
        setIngredients(data.ingredients || []);
        setError('');
      } else {
        setError('Không thể tải danh sách nguyên liệu');
      }
    } catch {
      setError('Lỗi mạng. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const filteredIngredients = ingredients.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreateModal = () => {
    setFormData({
      name: '',
      unit: 'kg',
      costPrice: '',
      stock: '0',
      minStock: '0',
      description: '',
    });
    setFormError('');
    setModalMode('create');
  };

  const openEditModal = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setFormData({
      name: ingredient.name,
      unit: ingredient.unit,
      costPrice: ingredient.costPrice.toString(),
      stock: ingredient.stock.toString(),
      minStock: ingredient.minStock.toString(),
      description: ingredient.description || '',
    });
    setFormError('');
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedIngredient(null);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      if (modalMode === 'create') {
        const response = await fetch('/api/ingredients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (response.ok) {
          setSuccessMessage('Thêm nguyên liệu thành công!');
          fetchIngredients();
          closeModal();
        } else {
          setFormError(data.error || 'Không thể thêm nguyên liệu');
        }
      } else if (modalMode === 'edit' && selectedIngredient) {
        const response = await fetch(`/api/ingredients/${selectedIngredient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (response.ok) {
          setSuccessMessage('Cập nhật nguyên liệu thành công!');
          fetchIngredients();
          closeModal();
        } else {
          setFormError(data.error || 'Không thể cập nhật nguyên liệu');
        }
      }
    } catch {
      setFormError('Lỗi mạng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const response = await fetch(`/api/ingredients/${deleteConfirm.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Xóa nguyên liệu thành công!');
        fetchIngredients();
      } else {
        setError(data.error || 'Không thể xóa nguyên liệu');
      }
    } catch {
      setError('Lỗi mạng. Vui lòng thử lại.');
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Calculate totals
  const totalIngredients = ingredients.length;
  const totalValue = ingredients.reduce((sum, i) => sum + (i.costPrice * i.stock), 0);
  const lowStockCount = ingredients.filter(i => i.stock <= i.minStock && i.minStock > 0).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🥬 Quản lý Nguyên liệu</h1>
          <p className="text-gray-500 mt-1">Quản lý nguyên liệu và giá vốn</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <span>➕</span>
          <span>Thêm nguyên liệu</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
              📦
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng nguyên liệu</p>
              <p className="text-2xl font-bold">{totalIngredients}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">
              💰
            </div>
            <div>
              <p className="text-sm text-gray-500">Giá trị tồn kho</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <div>
              <p className="text-sm text-gray-500">Sắp hết hàng</p>
              <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          ✅ {successMessage}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          ❌ {error}
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <input
          type="text"
          placeholder="🔍 Tìm kiếm nguyên liệu..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nguyên liệu</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đơn vị</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Giá vốn</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tồn kho</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sử dụng</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredIngredients.map((ingredient) => (
              <tr key={ingredient.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <p className="font-medium text-gray-900">{ingredient.name}</p>
                    {ingredient.description && (
                      <p className="text-sm text-gray-500">{ingredient.description}</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                    {ingredient.unit}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="font-medium">{formatCurrency(ingredient.costPrice)}</span>
                  <span className="text-gray-500 text-sm">/{ingredient.unit}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className={`font-medium ${ingredient.stock <= ingredient.minStock && ingredient.minStock > 0 ? 'text-red-600' : ''}`}>
                      {ingredient.stock}
                    </span>
                    {ingredient.stock <= ingredient.minStock && ingredient.minStock > 0 && (
                      <span className="text-red-500" title="Dưới mức tối thiểu">⚠️</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    {ingredient._count?.menuItems || 0} món
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => openEditModal(ingredient)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    ✏️ Sửa
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(ingredient)}
                    className="text-red-600 hover:text-red-800"
                  >
                    🗑️ Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredIngredients.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl mb-4 block">🥬</span>
            <p className="text-gray-500">
              {searchTerm ? 'Không tìm thấy nguyên liệu' : 'Chưa có nguyên liệu nào'}
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {modalMode === 'create' ? '➕ Thêm nguyên liệu' : '✏️ Sửa nguyên liệu'}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên nguyên liệu *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="VD: Thịt bò Úc"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Đơn vị *
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      {UNITS.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giá vốn (/{formData.unit}) *
                    </label>
                    <input
                      type="number"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="VD: 350000"
                      required
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tồn kho
                    </label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mức tối thiểu
                    </label>
                    <input
                      type="number"
                      value={formData.minStock}
                      onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
                    placeholder="Ghi chú về nguyên liệu..."
                    rows={2}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang lưu...' : modalMode === 'create' ? 'Thêm' : 'Cập nhật'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="text-center">
              <span className="text-5xl mb-4 block">⚠️</span>
              <h2 className="text-xl font-bold mb-2">Xác nhận xóa</h2>
              <p className="text-gray-600 mb-6">
                Bạn có chắc muốn xóa nguyên liệu &ldquo;<strong>{deleteConfirm.name}</strong>&rdquo;?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
