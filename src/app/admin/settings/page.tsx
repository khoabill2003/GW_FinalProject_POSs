'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import RestaurantInfo from '@/components/ui/RestaurantInfo';

interface Branch {
  id: string;
  name: string;
  address: string;
  phone?: string;
  image?: string;
}

export default function SettingsPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isOwner] = useState(user?.role === 'owner');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Displayed restaurant info (from API)
  const [displayedRestaurant, setDisplayedRestaurant] = useState({
    name: '',
    address: '',
    image: '',
    phone: '',
  });

  // Form input states (temporary, not displayed until saved)
  const [formData, setFormData] = useState({
    restaurantName: '',
    address: '',
    image: '',
  });
  const [imagePreview, setImagePreview] = useState('');

  // Branches
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    image: '',
  });

  // Tax settings
  const [displayedTaxRate, setDisplayedTaxRate] = useState(8);
  const [formTaxRate, setFormTaxRate] = useState(8);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/restaurants/settings');
        if (response.ok) {
          const data = await response.json();
          // Set displayed info
          setDisplayedRestaurant({
            name: data.restaurantName || '',
            address: data.mainBranch?.address || '',
            image: data.mainBranch?.image || '',
            phone: data.mainBranch?.phone || '',
          });
          // Set form data
          setFormData({
            restaurantName: data.restaurantName || '',
            address: data.mainBranch?.address || '',
            image: data.mainBranch?.image || '',
          });
          setImagePreview(data.mainBranch?.image || '');
          setBranches(data.branches || []);
          setDisplayedTaxRate(data.taxRate || 8);
          setFormTaxRate(data.taxRate || 8);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };

    if (isOwner) {
      loadSettings();
    }
  }, [isOwner]);





  if (!isAuthenticated || !isOwner) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
        ⚠️ Chỉ chủ sở hữu mới có thể truy cập trang này.
      </div>
    );
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setFormData({ ...formData, image: result });
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveTaxRate = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/restaurants/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: displayedRestaurant.name,
          mainBranch: {
            address: displayedRestaurant.address,
            image: displayedRestaurant.image,
          },
          taxRate: formTaxRate,
        }),
      });

      if (response.ok) {
        setDisplayedTaxRate(formTaxRate);
        setSuccessMessage('✅ Cập nhật tỷ lệ thuế thành công!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError('Không thể cập nhật tỷ lệ thuế');
      }
    } catch {
      setError('Lỗi mạng. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/restaurants/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: formData.restaurantName,
          mainBranch: {
            address: formData.address,
            image: formData.image || imagePreview,
          },
          taxRate: formTaxRate,
        }),
      });

      if (response.ok) {
        // Update displayed info after successful save
        setDisplayedRestaurant({
          name: formData.restaurantName,
          address: formData.address,
          image: formData.image || imagePreview,
          phone: displayedRestaurant.phone,
        });
        setDisplayedTaxRate(formTaxRate);
        setSuccessMessage('✅ Cập nhật thông tin nhà hàng thành công!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError('Không thể cập nhật thông tin');
      }
    } catch {
      setError('Lỗi mạng. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBranch = async () => {
    if (!branchForm.name || !branchForm.address) {
      setError('Vui lòng điền đầy đủ thông tin chi nhánh');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branchForm),
      });

      if (response.ok) {
        const { branch } = await response.json();
        setBranches([...branches, branch]);
        setBranchForm({
          name: '',
          address: '',
          image: '',
        });
        setShowBranchModal(false);
        setSuccessMessage('✅ Thêm chi nhánh thành công!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError('Không thể thêm chi nhánh');
      }
    } catch {
      setError('Lỗi mạng. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    if (confirm('Bạn chắc chắn muốn xóa chi nhánh này?')) {
      try {
        const response = await fetch(`/api/branches/${branchId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setBranches(branches.filter((b) => b.id !== branchId));
          setSuccessMessage('✅ Xóa chi nhánh thành công!');
          setTimeout(() => setSuccessMessage(''), 3000);
        } else {
          setError('Không thể xóa chi nhánh');
        }
      } catch {
        setError('Lỗi mạng. Vui lòng thử lại.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Logout */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">⚙️ Cài đặt nhà hàng</h1>
          <p className="text-gray-500 mt-1">Quản lý thông tin và chi nhánh</p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          🚪 Đăng xuất
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="font-bold">
            ✕
          </button>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Restaurant Info Editor */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">🏢 Nhập thông tin nhà hàng chính</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tên nhà hàng *
          </label>
          <input
            type="text"
            value={formData.restaurantName}
            onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
            placeholder="Tên nhà hàng"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Địa chỉ *
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Số nhà, tên đường"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hình ảnh nhà hàng
          </label>
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-lg"
              />
            )}
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={isLoading}
          className="w-full py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400"
        >
          {isLoading ? '⏳ Đang lưu...' : '✅ Lưu thông tin'}
        </button>
      </div>

      {/* Tax Settings */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">💰 Cài đặt thuế</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tỷ lệ thuế (%)
            </label>
            <input
              type="number"
              value={formTaxRate}
              onChange={(e) => setFormTaxRate(Math.max(0, Math.min(100, Number(e.target.value))))}
              min="0"
              max="100"
              step="0.1"
              className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-2">Thuế hiện tại được lưu: {displayedTaxRate}%</p>
            {formTaxRate !== displayedTaxRate && (
              <p className="text-sm text-orange-600 mt-1">Chưa lưu thay đổi</p>
            )}
          </div>
          <button
            onClick={handleSaveTaxRate}
            disabled={isLoading || formTaxRate === displayedTaxRate}
            className="w-full py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? '⏳ Đang lưu...' : '✅ Lưu tỷ lệ thuế'}
          </button>
        </div>
      </div>

      {/* Restaurant Info Display with RestaurantInfo Component */}
      {displayedRestaurant.name && (
        <RestaurantInfo
          name={displayedRestaurant.name}
          address={displayedRestaurant.address}
          phone={displayedRestaurant.phone}
          image={displayedRestaurant.image}
        />
      )}

      {/* Branches Management */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">🏪 Quản lý chi nhánh</h2>
          <button
            onClick={() => setShowBranchModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            ➕ Thêm chi nhánh
          </button>
        </div>

        {branches.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Chưa có chi nhánh nào</p>
        ) : (
          <div className="space-y-6">
            {branches.map((branch) => (
              <div key={branch.id} className="space-y-3">
                {/* RestaurantInfo for each branch */}
                <RestaurantInfo
                  name={branch.name}
                  address={branch.address}
                  phone={branch.phone}
                  image={branch.image}
                />
                
                {/* Branch details and delete button */}
                <div className="flex justify-between items-center px-2">
                  <div className="flex-1"></div>
                  <button
                    onClick={() => handleDeleteBranch(branch.id)}
                    className="text-sm px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                  >
                    🗑️ Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Branch Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Thêm chi nhánh mới</h2>
              <button
                onClick={() => setShowBranchModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              placeholder="Tên chi nhánh"
              value={branchForm.name}
              onChange={(e) =>
                setBranchForm({ ...branchForm, name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />

            <input
              type="text"
              placeholder="Địa chỉ"
              value={branchForm.address}
              onChange={(e) =>
                setBranchForm({ ...branchForm, address: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setBranchForm({
                      ...branchForm,
                      image: reader.result as string,
                    });
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />

            <div className="flex gap-2">
              <button
                onClick={handleAddBranch}
                disabled={isLoading}
                className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400"
              >
                {isLoading ? '⏳ Đang thêm...' : 'Thêm'}
              </button>
              <button
                onClick={() => {
                  setShowBranchModal(false);
                  setBranchForm({
                    name: '',
                    address: '',
                    image: '',
                  });
                }}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


