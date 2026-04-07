'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { Category, Ingredient, MenuItemIngredient, MenuItem, MenuType, SelectedIngredient } from '@/types';

type ModalMode = 'create' | 'edit' | null;

export default function MenuManagement() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type') as MenuType | null;

  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeType, setActiveType] = useState<MenuType>(typeParam || 'single');

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<MenuItem | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    type: 'single' as MenuType,
    available: true,
    image: '',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (typeParam) {
      setActiveType(typeParam);
    }
  }, [typeParam]);

  useEffect(() => {
    fetchMenuItems();
    fetchCategories();
    fetchIngredients();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/menu');
      const data = await response.json();

      if (response.ok) {
        setItems(data.menuItems);
        setError('');
      } else {
        setError(data.error || 'Không thể tải thực đơn');
      }
    } catch {
      setError('Lỗi mạng. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      if (response.ok) {
        setCategories(data.categories);
      }
    } catch {
      console.error('Failed to fetch categories');
    }
  };

  const fetchIngredients = async () => {
    try {
      const response = await fetch('/api/ingredients');
      const data = await response.json();
      if (response.ok) {
        setIngredients(data.ingredients || []);
      }
    } catch {
      console.error('Failed to fetch ingredients');
    }
  };

  // Tính giá vốn từ nguyên liệu
  const calculateCostPrice = (ingredientsList: SelectedIngredient[]) => {
    return ingredientsList.reduce((total, item) => {
      const ingredient = ingredients.find(i => i.id === item.ingredientId);
      if (ingredient) {
        return total + (ingredient.costPrice * item.quantity);
      }
      return total;
    }, 0);
  };

  const filteredItems = items.filter(item => item.type === activeType);

  const getTypeLabel = (type: MenuType) => {
    switch (type) {
      case 'single': return 'Món lẻ';
      case 'buffet': return 'Buffet';
      case 'set_menu': return 'Set Menu';
      default: return type;
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError('Hình ảnh không được lớn hơn 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFormData({ ...formData, image: base64 });
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      categoryId: categories[0]?.id || '',
      type: activeType,
      available: true,
      image: '',
    });
    setSelectedIngredients([]);
    setImagePreview(null);
    setFormError('');
    setModalMode('create');
  };

  const openEditModal = (item: MenuItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      categoryId: item.categoryId || item.category?.id || '',
      type: item.type as MenuType,
      available: item.available,
      image: item.image || '',
    });
    // Load existing ingredients
    if (item.ingredients) {
      setSelectedIngredients(
        item.ingredients.map(ing => ({
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
        }))
      );
    } else {
      setSelectedIngredients([]);
    }
    setImagePreview(item.image || null);
    setFormError('');
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedItem(null);
    setSelectedIngredients([]);
    setFormError('');
    setImagePreview(null);
  };

  // Ingredient management
  const addIngredient = () => {
    if (ingredients.length > 0) {
      const unusedIngredient = ingredients.find(
        i => !selectedIngredients.some(s => s.ingredientId === i.id)
      );
      if (unusedIngredient) {
        setSelectedIngredients([
          ...selectedIngredients,
          { ingredientId: unusedIngredient.id, quantity: 1 },
        ]);
      }
    }
  };

  const removeIngredient = (index: number) => {
    setSelectedIngredients(selectedIngredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: 'ingredientId' | 'quantity', value: string | number) => {
    const updated = [...selectedIngredients];
    if (field === 'ingredientId') {
      updated[index].ingredientId = value as string;
    } else {
      updated[index].quantity = parseFloat(value as string) || 0;
    }
    setSelectedIngredients(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    const submitData = {
      ...formData,
      ingredients: selectedIngredients,
    };

    try {
      if (modalMode === 'create') {
        const response = await fetch('/api/menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        });

        const data = await response.json();

        if (response.ok) {
          setSuccessMessage('Thêm món thành công!');
          fetchMenuItems();
          closeModal();
        } else {
          setFormError(data.error || 'Không thể thêm món');
        }
      } else if (modalMode === 'edit' && selectedItem) {
        const response = await fetch(`/api/menu/${selectedItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        });

        const data = await response.json();

        if (response.ok) {
          setSuccessMessage('Cập nhật món thành công!');
          fetchMenuItems();
          closeModal();
        } else {
          setFormError(data.error || 'Không thể cập nhật món');
        }
      }
    } catch {
      setFormError('Lỗi mạng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmItem) return;

    try {
      const response = await fetch(`/api/menu/${deleteConfirmItem.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Xóa món thành công!');
        fetchMenuItems();
      } else {
        setError(data.error || 'Không thể xóa món');
      }
    } catch {
      setError('Lỗi mạng. Vui lòng thử lại.');
    } finally {
      setDeleteConfirmItem(null);
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      const response = await fetch(`/api/menu/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: !item.available }),
      });

      if (response.ok) {
        fetchMenuItems();
      }
    } catch {
      console.error('Failed to toggle availability');
    }
  };

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Thực Đơn</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchMenuItems}
            className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            🔄
          </button>
          <button
            onClick={openCreateModal}
            disabled={categories.length === 0}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            + Thêm Món
          </button>
        </div>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['single', 'buffet', 'set_menu'] as MenuType[]).map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`px-6 py-3 font-medium transition-colors ${
              activeType === type
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {getTypeLabel(type)}
            <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
              {items.filter(i => i.type === type).length}
            </span>
          </button>
        ))}
      </div>

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

      {categories.length === 0 && !isLoading && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg">
          ⚠️ Chưa có danh mục. Vui lòng tạo danh mục trước khi thêm món.
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <p className="text-gray-500">Đang tải...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="text-5xl mb-4">🍽️</div>
          <p className="text-gray-500">Chưa có món {getTypeLabel(activeType).toLowerCase()} nào</p>
          <button
            onClick={openCreateModal}
            disabled={categories.length === 0}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            Thêm Món đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-xl shadow-sm overflow-hidden ${
                !item.available ? 'opacity-60' : ''
              }`}
            >
              {/* Image */}
              <div className="aspect-video bg-gray-100 relative">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    🍽️
                  </div>
                )}
                {!item.available && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-medium">Hết hàng</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <span className="text-primary-600 font-bold">
                    {formatCurrency(item.price)}
                  </span>
                </div>

                <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                  {item.description || 'Không có mô tả'}
                </p>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {item.category?.icon} {item.category?.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAvailability(item)}
                    className={`flex-1 px-2 py-1 text-xs rounded ${
                      item.available
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.available ? 'Còn hàng' : 'Hết hàng'}
                  </button>
                  <button
                    onClick={() => openEditModal(item)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setDeleteConfirmItem(item)}
                    className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 my-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {modalMode === 'create' ? 'Thêm Món mới' : 'Sửa Món'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {formError}
                </div>
              )}

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hình ảnh
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">📷</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    />
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG tối đa 5MB</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên món *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giá (VNĐ) *
                  </label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as MenuType })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="single">Món lẻ</option>
                    <option value="buffet">Buffet</option>
                    <option value="set_menu">Set Menu</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Danh mục *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    rows={2}
                  />
                </div>
              </div>

              {/* Nguyên liệu */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    🥬 Nguyên liệu (Giá vốn: {formatCurrency(calculateCostPrice(selectedIngredients))})
                  </label>
                  <button
                    type="button"
                    onClick={addIngredient}
                    disabled={selectedIngredients.length >= ingredients.length}
                    className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
                  >
                    + Thêm nguyên liệu
                  </button>
                </div>

                {selectedIngredients.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Chưa có nguyên liệu nào</p>
                ) : (
                  <div className="space-y-2">
                    {selectedIngredients.map((item, index) => {
                      const ingredient = ingredients.find(i => i.id === item.ingredientId);
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <select
                            value={item.ingredientId}
                            onChange={(e) => updateIngredient(index, 'ingredientId', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            {ingredients.map((ing) => (
                              <option key={ing.id} value={ing.id}>
                                {ing.name} ({formatCurrency(ing.costPrice)}/{ing.unit})
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center"
                            step="0.1"
                            min="0"
                          />
                          <span className="text-sm text-gray-500 w-12">{ingredient?.unit}</span>
                          <button
                            type="button"
                            onClick={() => removeIngredient(index)}
                            className="text-red-500 hover:text-red-700 px-2"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Profit calculation */}
                {formData.price && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="flex justify-between">
                      <span>Giá bán:</span>
                      <span className="font-medium">{formatCurrency(parseFloat(formData.price) || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Giá vốn:</span>
                      <span className="text-red-600">-{formatCurrency(calculateCostPrice(selectedIngredients))}</span>
                    </div>
                    <div className="flex justify-between border-t mt-2 pt-2 font-medium">
                      <span>Lợi nhuận:</span>
                      <span className="text-green-600">
                        {formatCurrency((parseFloat(formData.price) || 0) - calculateCostPrice(selectedIngredients))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="available"
                  checked={formData.available}
                  onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                />
                <label htmlFor="available" className="text-sm font-medium text-gray-700">
                  Còn hàng
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang lưu...' : modalMode === 'create' ? 'Thêm Món' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Xóa Món</h2>
            <p className="text-gray-600 mb-6">
              Bạn có chắc muốn xóa <strong>{deleteConfirmItem.name}</strong>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
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
      )}
    </div>
  );
}
